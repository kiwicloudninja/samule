var UseiTerm = false;

window.addEventListener('DOMContentLoaded', init, false);

function init() {
    var LaunchBtn = document.getElementById('launch');
    var OptionsBtn = document.getElementById('optionsBtn');
    var ProfileNameEl = document.getElementById('profileName');
    var SPidEl = document.getElementById('spid');
    var IDpidEl = document.getElementById('idpid');

    chrome.storage.sync.get({
        profiles: ['default'],
        default: 'default',
        spid: '',
        idpid: '',
        iterm: false,
    }, function(items) {
        enableProfileSelect(items.profiles, items.default)
        ProfileNameEl.value = items.default;
        SPidEl.value = items.spid;
        IDpidEl.value = items.idpid;
        UseiTerm = items.iterm;

        updateTokenText();
        enableLaunchBtn();
    });

    LaunchBtn.onclick = launchCLI;
    ProfileNameEl.onkeyup = enableLaunchBtn;
    OptionsBtn.onclick = viewOptions;
}

function updateTokenText() {
    var SAMLToken = chrome.extension.getBackgroundPage().SAMLToken;

    SamlStatusEl = document.getElementById('samlStatus');
    SamlLoadingEl = document.getElementById('loadingSAML');
    SamlHintEl = document.getElementById('samlHint');

    if(! SAMLToken) {
        var SPidVal = document.getElementById('spid').value;
        var IDpidVal = document.getElementById('idpid').value;

        if(SPidVal && IDpidVal) {
            SamlHintEl.className = "hidden";
            SamlLoadingEl.className = "visible";
            SamlStatusEl.innerHTML = "Loading SAML Token in background window..."
            var AuthURL = `https://accounts.google.com/o/saml2/initsso?idpid=${IDpidVal}&spid=${SPidVal}&forceauthn=false`;
            openBGWindow(AuthURL, updateTokenText);
        }
        return;
    }
    SamlHintEl.className = "hidden";
    SamlLoadingEl.className = "hidden";
    SamlStatusEl.innerHTML = '<p>Available Roles <span id="samlDuration"></span>:</p>';
    SamlTextEl = document.getElementById('samlText');

    Parser = new DOMParser()
    DOMDoc = Parser.parseFromString(SAMLToken, "text/xml");

    var RoleDomNodes = DOMDoc.querySelectorAll('[Name="https://aws.amazon.com/SAML/Attributes/Role"]')[0].childNodes
    var SessionDuration = DOMDoc.querySelectorAll('[Name="https://aws.amazon.com/SAML/Attributes/SessionDuration"]')[0].childNodes[0]
    
    if(SessionDuration) {
        Duration = parseInt(SessionDuration.innerHTML)/60;
        Mins = Duration%60 > 0?` ${Duration%60} mins`:"";
        Hours = Duration/60 >= 1?` ${Math.floor(Duration/60)} hrs`:"";
        document.getElementById('samlDuration').innerHTML = ` (Session Duration ${Hours}${Mins})`;
    }
    SamlTextEl.innerHTML = "";
    if (RoleDomNodes.length > 1) {
        for (i = 0; i < RoleDomNodes.length; i++) {
          var NodeValues = RoleDomNodes[i].innerHTML.split(",");
          var SamlRole = "";
          for(ir = 0; ir < NodeValues.length; ir++) {
              RoleStart = NodeValues[ir].search("role/");
              if(RoleStart > 0)
                SamlRole = NodeValues[ir].substr(RoleStart + 5);
          };
          SamlTextEl.innerHTML += "<p>" + SamlRole + "</p>";
        }
        enableLaunchBtn();
    }
}

function updateProfileSel(e) {
  document.getElementById('profileName').value = e.target.value;
}

function enableProfileSelect(ProfileList, DefaultProfile) {
    var ProfileSel = document.getElementById('selectProfile');
    var ProfileNameEl = document.getElementById('profileName');

    ProfileSel.onchange = updateProfileSel;
    ProfileSel.onclick = updateProfileSel;

    if(ProfileList) {
        ProfileList.forEach(function(ElText) {
            var El = document.createElement("option");
            El.textContent = ElText;
            El.value = ElText;
            ProfileSel.appendChild(El);
        });
    }
    ProfileSel.value = DefaultProfile;
}

function enableLaunchBtn() {
    var LaunchBtn = document.getElementById('launch');
    var ProfileName = document.getElementById('profileName').value;
    var SAMLToken = chrome.extension.getBackgroundPage().SAMLToken;

    LaunchBtn.disabled = !ProfileName || !SAMLToken;

    if(SAMLToken) {
      if(LaunchBtn.disabled)
        hint = "<p>Type a profile name to authenticate against.</p>";
      else
        hint = "<p>Click the Start CLI button to authenticate with the choosen profile name.</p>";

      document.getElementById('infoText').innerHTML = hint;
    }
}

function launchCLI(e) {
    var ProfileName = document.getElementById('profileName').value;
    var SAMLToken = chrome.extension.getBackgroundPage().SAMLToken;

    var TermStr = UseiTerm?"?term=iterm":"";
    var TermURL = `samule://${ProfileName}${TermStr}`;

    navigator.clipboard.writeText(btoa(SAMLToken)).then(function() {
        document.getElementById('actionText').innerHTML = "Launching samule://" + ProfileName + " in background";
        setTimeout(function(){ document.getElementById('actionText').innerHTML = "" }, 3000);
        openBGWindow(TermURL, updateTokenText);
    }, function() {
        document.getElementById('actionText').innerHTML = "Unable to access clipboard!";
    });
}

function viewOptions(e) {
    if (chrome.runtime.openOptionsPage)
      chrome.runtime.openOptionsPage();
    else
      window.open(chrome.runtime.getURL('options.html'));
}


function openBGWindow(targetURL, callback=null) {
    chrome.windows.create(
        {
            url: targetURL,
            type: "normal",
            focused: false,
            state: "minimized"
        }, function(hiddenWindow) {
            setTimeout(function(){ closeBGWindow(hiddenWindow.id); }, 5000)
        }
    );
    if(callback)
        setTimeout(callback, 3000)
}

function closeBGWindow(windowID) {
    chrome.windows.remove(windowID);
}
