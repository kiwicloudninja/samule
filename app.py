import json
import boto3
import datetime
#import pprint
import os
import logging
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.core import patch_all

patch_all()

tracing = os.environ['AWS_XRAY_DEBUG_LEVEL']
debug_level = logging.getLevelName(tracing)

logging.basicConfig(level=tracing)
logger = logging.getLogger('aws_xray_sdk')
logger.setLevel(debug_level)

class ValidationError(Exception):
    def __init__(self, value):
        self.value = value

def lambda_handler(event, context):

    logger.info(event)
    try:
        datastore = "%s-%s-chat-transcripts" % (os.environ['env'], os.environ['service'])

        botName = os.environ['BOTNAME']
        botAlias = os.environ['BOTALIAS']

        req_keys = {
            'sid',
            'fm-custom-data',
            'fm-question',
            'fm-avatar',
            'fm-conversation'
            }

        data = json.loads(event['body'])

        if not req_keys <= set(data):
            need_keys = list(set(req_keys).symmetric_difference(set(data.keys())))
            delim = ", "
            fields = "] field" if not len(need_keys) > 1 else "] fields"
            raise ValidationError("Validation failed: Missing [" + delim.join(need_keys) + fields)

        sid = data['sid']
        fm_avatar = data['fm-avatar']
        fm_avatype = json.loads(fm_avatar)['type']
        fm_question = "Hello" if fm_avatype == "WELCOME" else data['fm-question']
        fm_custom_data = data['fm-custom-data']

        suggestions = "" if not fm_avatype == "WELCOME" else "{\"suggestedResponses\": [\"I want to log a Request\",\"I need help with the Canon printer\",\"I've got a new person starting soon.\",\"How do I recover my Microsoft Word files?\" ]}"

        if data['fm-conversation'] is None:
            session_attributes = {"sid":sid}
            fm_conversation = {"sid":sid}
            fm_transcript = []
        else:
            fm_conversation = json.loads(data['fm-conversation'])
            session_attributes = fm_conversation['session']
            fm_transcript = fm_conversation['transcript']

        #request_attributes = {} if not fm_custom_data else fm_custom_data

        if fm_question != "":
            lexresponse = boto3.client('lex-runtime').post_text(
                botName=botName,
                botAlias=botAlias,
                userId=sid,
                sessionAttributes=session_attributes,
                requestAttributes={},
                inputText= fm_question
            )

            logger.info(lexresponse['sessionAttributes'])

            saveTranscript = False
            if 'elicitResponseNamespace' in lexresponse['sessionAttributes']:
                saveTranscript = lexresponse['sessionAttributes']['elicitResponseNamespace'] == "askanother"

            # sentiment = lexresponse['sentimentResponse']['sentimentLabel']
            answer = lexresponse['message'].replace('OK.', 'Okay, ')
            intent = lexresponse['intentName']

            fm_transcript.append({
                 "qn" : fm_question,
                 "rsp" : answer
            })

            fm_conversation = {
                "session": lexresponse['sessionAttributes'],
                "transcript": fm_transcript
            }
            sentiment = "POSITIVE" if fm_question == "Hello" or (answer[-1] == "." or answer[-1] == "!") else "MIXED"

        else:
            fm_question = "."
            answer = "Sorry I didn't quite catch that. Would you mind repeating it for me please."
            sentiment = "NEGATIVE"
            intent = ""

        expression_tones = {
            "POSITIVE": { 'tone': "happiness", 'expression': 'smile' },
            "NEGATIVE": { 'tone': "empathy", 'expression': 'browsSqueeze' },
            "NEUTRAL": { 'tone': "neutral", 'expression': 'headNod' },
            "MIXED": { 'tone': "intrigue", 'expression': 'headNod' }
        }
        et_setting = expression_tones.get(sentiment, expression_tones['NEUTRAL'])

        answer_body = {
            "answer": answer,
            "instructions": {
              "expressionEvent": [
                {
                  "expression": et_setting['expression'],
                  "value": 1.0,
                  "start": 1,
                  "duration": 1
                 }
               ],
              "emotionalTone": [
                {
                  "tone": et_setting['tone'],
                  "value": 0.5,
                  "start": 1,
                  "duration": 4,
                  "additive": False,
                  "default": False
                }
              ],
              "displayHtml": {
                "html": suggestions
              }
            }
        }

        body = {
            "answer": json.dumps(answer_body),
            "conversationPayload": json.dumps(fm_conversation),
            "matchedContext": intent
        }

        response = {
              "statusCode": 200,
              "headers": {'Content-Type': 'application/json'},
              "body": json.dumps(body)
        }

        if saveTranscript:
            writetranscript = boto3.client('dynamodb').put_item(
                                TableName=datastore,
                                Item={
                                    'sid': {
                                        'S': sid,
                                     },
                                    'tstamp': {
                                        'S' :  str(datetime.datetime.utcnow()),
                                     },
                                    'tscript': {
                                        'S' : json.dumps(fm_transcript),
                                      },
                                    'mtch': {
                                        'S' : intent,
                                    },
                                    'othattr': {
                                        'S' : json.dumps(fm_conversation),
                                    },
                                    'cdata': {
                                        'S' : fm_custom_data,
                                    }
                                }
                            )


        return (response)

    except ValidationError as error:
        body = {"error": error.value}
        response = {
              "statusCode": 400,
              "headers": {'Content-Type': 'application/json'},
              "body": json.dumps(body)
        }
        return (response)
