
function saveOptionsToStorage(profileList, defaultProfile) {
    chrome.storage.sync.set({
        profiles: profileList,
        default: defaultProfile
    });
}

window.addEventListener('DOMContentLoaded', init, false);

function init() {
    var configFileSel = document.getElementById('configFile');
    configFileSel.addEventListener('change', handleFileSelect, false);

    var saveAuthBtn = document.getElementById('saveAuth');
    saveAuthBtn.addEventListener('click', saveAuthVals, false);

    var clearAuthBtn = document.getElementById('clearAuth');
    clearAuthBtn.addEventListener('click', clearAuthVals, false);

    chrome.storage.sync.get({
        profiles: ['default'],
        default: 'default',
        spid: '',
        idpid: '',
        iterm: false,
    }, function(items) {
        enableProfileSelect(items.profiles, items.default);
        updateAuthOpts(items.spid, items.idpid);
        updateTerm(items.iterm);
    });

    enableSaveAuth();
}

function enableSaveAuth() {
    var spidVal = document.getElementById('spid').value;
    var idpidVal = document.getElementById('idpid').value;
    var saveAuthBtn = document.getElementById('saveAuth');

    saveAuthBtn.disabled = spidVal == "" || idpidVal == "";
}

function saveAuthVals() {
    var spidVal = document.getElementById('spid').value;
    var idpidVal = document.getElementById('idpid').value;

    var today = new Date();

    chrome.storage.sync.set({spid: spidVal, idpid: idpidVal});
    document.getElementById("optsStatus").innerHTML = "Updated " + today.toLocaleTimeString();
}

function clearAuthVals() {
  document.getElementById('spid').value = "";
  document.getElementById('idpid').value = "";

  saveAuthVals();
}

function saveTermVal() {
    var termVal = document.getElementById('iterm').checked;
    console.log("Term Value: ", termVal);
    chrome.storage.sync.set({iterm: termVal});
}

function updateTerm(checkedVal) {
    var iTermEl = document.getElementById('iterm');
    iTermEl.addEventListener('click', saveTermVal, false);

    iTermEl.checked = checkedVal;
}

function updateAuthOpts(spidVal, idpidVal) {
    var spidEl = document.getElementById('spid');
    var idpidEl = document.getElementById('idpid');

    console.log("Auth values:", spidVal, idpidVal);

    spidEl.value = spidVal;
    idpidEl.value = idpidVal;

    spidEl.onkeyup = function(e) {
        enableSaveAuth();
    }
    idpidEl.onkeyup = function(e) {
        enableSaveAuth();
    }
}

function enableProfileSelect(profileList, defaultProfile) {
    var defaultSelect = document.getElementById('defaultProfile');

    defaultSelect.onchange = function(e) {
        defaultProfile = e.target.value;
        chrome.storage.sync.set({default: e.target.value});
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

function handleFileSelect(evt) {
  var reader = new FileReader();
  console.log(evt.target.files[0])
  reader.readAsText(evt.target.files[0]);

  reader.onload = function(e) {
    var text = reader.result;
    var awsConfig = parseINIString(text);

    localProfiles = [];
    Object.keys(awsConfig).forEach(function(key) {
        var elText = key.replace("profile ", "");
        localProfiles.push(elText);
    });
    chrome.storage.sync.set({profiles: localProfiles});
    enableProfileSelect(localProfiles, localProfiles[0]);
  }
}

function parseINIString(data){
    var regex = {
        section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
        param: /^\s*([^=]+?)\s*=\s*(.*?)\s*$/,
        comment: /^\s*;.*$/
    };
    var value = {};
    var lines = data.split(/[\r\n]+/);
    var section = null;
    lines.forEach(function(line){
        if(regex.comment.test(line)){
            return;
        }else if(regex.param.test(line)){
            var match = line.match(regex.param);
            if(section){
                value[section][match[1]] = match[2];
            }else{
                value[match[1]] = match[2];
            }
        }else if(regex.section.test(line)){
            var match = line.match(regex.section);
            value[match[1]] = {};
            section = match[1];
        }else if(line.length == 0 && section){
            section = null;
        };
    });
    return value;
}
