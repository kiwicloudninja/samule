var UseiTerm = false;
var HiddenLaunch = false;
var SPid = "";
var IDpid = "";

window.addEventListener('DOMContentLoaded', init, false);

function init() {
    const LaunchBtn = document.getElementById('launch');
    const OptionsBtn = document.getElementById('optionsBtn');
    const TokenBtn = document.getElementById('getToken');
    const ProfileNameEl = document.getElementById('profileName');

    chrome.storage.sync.get({
        profiles: ['default'],
        default: 'default',
        spid: '',
        idpid: '',
        iterm: false,
        applaunch: false,
    }, function(items) {
        enableProfileSelect(items.profiles, items.default)
        ProfileNameEl.value = items.default;
        SPid = items.spid;
        IDpid = items.idpid;
        UseiTerm = items.iterm;
        HiddenLaunch = items.applaunch;

        updateTokenText();
        enableLaunchBtn();
    });

    TokenBtn.onclick = updateTokenText;
    LaunchBtn.onclick = launchCLI;
    ProfileNameEl.onkeyup = enableLaunchBtn;
    OptionsBtn.onclick = viewOptions;
}

function enableRefreshToken() {
    GetTokenBtn = document.getElementById('getToken');

    document.getElementById('samlStatus').innerHTML = "Click Refresh Token button to obtain a new token.";
    document.getElementById('actionText').innerHTML = "SAML Token expired.";
    document.getElementById('samlText').innerHTML = "";

    GetTokenBtn.className = "visible";
    enableLaunchBtn();
}

function updateTokenText() {
    const SAMLToken = chrome.extension.getBackgroundPage().SAMLToken;
    console.log(SAMLToken);

    SamlStatusEl = document.getElementById('samlStatus');
    SamlLoadingEl = document.getElementById('loadingSAML');
    SamlHintEl = document.getElementById('samlHint');
    GetTokenBtn = document.getElementById('getToken');
    GetTokenBtn.className = "hidden";

    if(! SAMLToken) {
        if(SPid && IDpid) {
            SamlHintEl.className = "hidden";
            SamlLoadingEl.className = "visible";
            SamlStatusEl.innerHTML = "Loading SAML Token in background window..."
            const AuthURL = `https://accounts.google.com/o/saml2/initsso?idpid=${IDpid}&spid=${SPid}&forceauthn=false`;
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

    const RoleDomNodes = DOMDoc.querySelectorAll('[Name="https://aws.amazon.com/SAML/Attributes/Role"]')[0].childNodes
    var SAMLExpiry;
    var SessionDuration = 0;
    if(DOMDoc.querySelectorAll('[Name="https://aws.amazon.com/SAML/Attributes/SessionDuration"]').length > 0) {
      SessionDuration = DOMDoc.querySelectorAll('[Name="https://aws.amazon.com/SAML/Attributes/SessionDuration"]')[0].childNodes[0]
      const ExpiryEl = DOMDoc.querySelector('SubjectConfirmationData');
      SAMLExpiry = Date.parse(ExpiryEl.getAttribute('NotOnOrAfter'));
    }
    else {
      SAMLExpiry = new Date();
      SAMLExpiry.setMinutes(SAMLExpiry.getMinutes() + 5);
    }
    const dt = new Date(SAMLExpiry);
    const expiry = dt.toLocaleTimeString();

    document.getElementById('actionText').innerHTML = `SAML Token expires at ${expiry}`;
    const Expiry = SAMLExpiry - Date.now();
    setTimeout(enableRefreshToken, Expiry)
    console.log("Expiring token in ", Expiry);

    if(SessionDuration) {
        Duration = parseInt(SessionDuration.innerHTML)/60;
        Mins = Duration%60 > 0?` ${Duration%60} mins`:"";
        Hours = Duration/60 >= 1?` ${Math.floor(Duration/60)} hrs`:"";
        document.getElementById('samlDuration').innerHTML = ` (Session Duration ${Hours}${Mins})`;
    }
    else {
      document.getElementById('samlDuration').innerHTML = " (Session Duration 12 hrs)";
    }
    SamlTextEl.innerHTML = "";
    if (RoleDomNodes.length > 1) {
        for (i = 0; i < RoleDomNodes.length; i++) {
          const NodeValues = RoleDomNodes[i].innerHTML.split(",");
          let SamlRole = "";
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
    const ProfileSel = document.getElementById('selectProfile');
    const ProfileNameEl = document.getElementById('profileName');

    ProfileSel.onchange = updateProfileSel;
    ProfileSel.onclick = updateProfileSel;

    if(ProfileList) {
        ProfileList.forEach(function(ElText) {
            let El = document.createElement("option");
            El.textContent = ElText;
            El.value = ElText;
            ProfileSel.appendChild(El);
        });
    }
    ProfileSel.value = DefaultProfile;
}

function enableLaunchBtn() {
    const LaunchBtn = document.getElementById('launch');
    const ProfileName = document.getElementById('profileName').value;
    const SAMLToken = chrome.extension.getBackgroundPage().SAMLToken;

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
    const ProfileName = document.getElementById('profileName').value;
    const SAMLToken = chrome.extension.getBackgroundPage().SAMLToken;

    const TermStr = UseiTerm?"?term=iterm":"";
    const TermURL = `samule://${ProfileName}${TermStr}`;

    navigator.clipboard.writeText(btoa(SAMLToken)).then(function() {
        document.getElementById('actionText').innerHTML = "Launching samule://" + ProfileName + " in background";
        setTimeout(function(){ document.getElementById('actionText').innerHTML = "" }, 3000);
        openBGWindow(TermURL, updateTokenText, HiddenLaunch);
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


function openBGWindow(targetURL, callback=null, hidden=true) {
    const WindowState = hidden?"minimized":"normal";
    console.log("Window State", WindowState);
    console.log("Hidden", hidden);
    console.log("AppLaunch", HiddenLaunch);
    chrome.windows.create(
        {
            url: targetURL,
            type: "normal",
            focused: !hidden,
            state: WindowState
        }, function(hiddenWindow) {
            if(hidden)
                setTimeout(function(){ closeBGWindow(hiddenWindow.id); }, 5000)
        }
    );
    if(callback)
        setTimeout(callback, 3000)
}

function closeBGWindow(windowID) {
    chrome.windows.remove(windowID);
}
