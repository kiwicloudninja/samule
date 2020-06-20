
window.addEventListener('DOMContentLoaded', init, false);

function init() {
    var launchBtn = document.getElementById('launch');
    var profileName = document.getElementById('profileName');
    var spidEl = document.getElementById('spid');
    var idpidEl = document.getElementById('idpid');

    chrome.storage.sync.get({
        profiles: ['default'],
        default: 'default',
        spid: '',
        idpid: '',
    }, function(items) {
        enableProfileSelect(items.profiles, items.default)
        profileName.value = items.default;
        spidEl.value = items.spid;
        idpidEl.value = items.idpid;
        updateTokenText();
        enableLaunchBtn();
    });

    launchBtn.onclick = launchCLI;
    profileName.onkeyup = enableLaunchBtn;

}

function closeBGWindow(windowID) {
    console.log("Closing Window ", windowID);
    chrome.windows.remove(windowID);
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


function updateTokenText() {
    var bg = chrome.extension.getBackgroundPage();
    var SAMLToken = bg.SAMLToken;
    var authURL = "https://accounts.google.com/o/saml2/initsso?idpid=C00lvep1m&spid=108192152471&forceauthn=false";

    SamlBox = document.getElementById('samlBox');
    SamlStatus = document.getElementById('samlStatus');

    if(! SAMLToken) {
        var spidVal = document.getElementById('spid').value;
        var idpidVal = document.getElementById('idpid').value;

        if(spidVal != "" && idpidVal != "")
            SamlStatus.innerHTML = "Loading SAML Token in background window..."
            var authURL = `https://accounts.google.com/o/saml2/initsso?idpid=${idpidVal}&spid=${spidVal}&forceauthn=false`;
            openBGWindow(authURL, updateTokenText);
        return;
    }
    SamlStatus.innerHTML = '<p>Available Roles <span id="samlDuration"></span>:</p>';
    SamlText = document.getElementById('samlText');
    DurationText = document.getElementById('samlDuration');

    parser = new DOMParser()
    domDoc = parser.parseFromString(SAMLToken, "text/xml");

    var roleDomNodes = domDoc.querySelectorAll('[Name="https://aws.amazon.com/SAML/Attributes/Role"]')[0].childNodes
    var sessionDuration = domDoc.querySelectorAll('[Name="https://aws.amazon.com/SAML/Attributes/SessionDuration"]')[0].childNodes[0]

    if(sessionDuration) {
        duration = parseInt(sessionDuration.innerHTML)/60;
        mins = duration%60 > 0?` ${duration%60} mins`:"";
        hours = duration/60 >= 1?` ${Math.floor(duration/60)} hrs`:"";
        DurationText.innerHTML = ` (Session Duration ${hours}${mins})`;
    }
    SamlText.innerHTML = "";
    if (roleDomNodes.length > 1) {
        for (i = 0; i < roleDomNodes.length; i++) {
          var nodeValue = roleDomNodes[i].innerHTML.split(",", 1)[0];
          var roleStart = nodeValue.search("role/") + 5;
          if(roleStart > 4)
            SamlText.innerHTML += "<p>" + nodeValue.substr(roleStart) + "</p>";
    }
    enableLaunchBtn();
  }
}

function enableProfileSelect(profileList, defaultProfile) {
    var defaultSelect = document.getElementById('selectProfile');
    var profileName = document.getElementById('profileName');

    defaultSelect.onchange = function(e) {
        profileName.value = e.target.value;
    }

    if(profileList) {
        profileList.forEach(function(elText) {
            var el = document.createElement("option");
            el.textContent = elText;
            el.value = elText;
            defaultSelect.appendChild(el);
        });
    }
    defaultSelect.value = defaultProfile;
}

function enableLaunchBtn() {
    var launchBtn = document.getElementById('launch');
    var profileName = document.getElementById('profileName');
    var bg = chrome.extension.getBackgroundPage();
    var SAMLToken = bg.SAMLToken;

    launchBtn.disabled = profileName.value == "" || !SAMLToken;
}

function launchCLI(e) {
    var profileName = document.getElementById('profileName');
    var actionText = document.getElementById('actionText');
    var bg = chrome.extension.getBackgroundPage();
    var SAMLToken = bg.SAMLToken;

    console.log("Token:", btoa(SAMLToken));

    actionText.innerHTML = "Launching samule://" + profileName.value + " in background";

    var termURL = `samule://${profileName.value}?token=${btoa(SAMLToken)}`;
    openBGWindow(termURL, updateTokenText);
}
