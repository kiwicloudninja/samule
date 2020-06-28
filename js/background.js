// Global variables
var SAMLToken = ""

addOnBeforeRequestEventListener();

// Add an EventListener for each request to signin.aws.amazon.com
function addOnBeforeRequestEventListener() {
  if (chrome.webRequest.onBeforeRequest.hasListener(onBeforeRequestEvent)) {
    console.log("ERROR: onBeforeRequest EventListener could not be added, because onBeforeRequest already has an EventListener.");
  } else {
    chrome.webRequest.onBeforeRequest.addListener(
      onBeforeRequestEvent,
      {urls: ["https://signin.aws.amazon.com/saml"]},
      ["requestBody"]
    );
  }
}

// Remove listener on extension deactivation
function removeOnBeforeRequestEventListener() {
  chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequestEvent);
}

// Callback for each request to https://signin.aws.amazon.com/saml
function onBeforeRequestEvent(details) {
  // Decode base64 SAML assertion in the request
  let samlXmlDoc = "";
  let formDataPayload = undefined;
  if (details.requestBody.formData) {
    samlXmlDoc = decodeURIComponent(unescape(window.atob(details.requestBody.formData.SAMLResponse[0])));
  } else if (details.requestBody.raw) {
    let combined = new ArrayBuffer(0);
    details.requestBody.raw.forEach(function(element) {
      let tmp = new Uint8Array(combined.byteLength + element.bytes.byteLength);
      tmp.set( new Uint8Array(combined), 0 );
      tmp.set( new Uint8Array(element.bytes),combined.byteLength );
      combined = tmp.buffer;
    });
    const combinedView = new DataView(combined);
    const decoder = new TextDecoder('utf-8');
    formDataPayload = new URLSearchParams(decoder.decode(combinedView));
    samlXmlDoc = decodeURIComponent(unescape(window.atob(formDataPayload.get('SAMLResponse'))))
  }
  SAMLToken = samlXmlDoc;
  setTimeout(expireToken, 301000);
}

function diff_minutes(NowDate, EndDate)
 {
     const DiffMS = NowDate - EndDate;
     return Math.floor((DiffMS/1000)/60);
 }

function expireToken()
{
    const Parser = new DOMParser();
    const DOMDoc = Parser.parseFromString(SAMLToken, "text/xml");

    const ExpiryEl = DOMDoc.querySelector('SubjectConfirmationData');
    const SAMLExpiry = Date.parse(ExpiryEl.getAttribute('NotOnOrAfter'));

    const expired = Date.now() > SAMLExpiry;

    if(expired) {
        SAMLToken = "";
        expired = diff_minutes(SAMLExpiry, Date.now());
        console.log(`Token Expired ${expired} minutes ago`);
    }
}
