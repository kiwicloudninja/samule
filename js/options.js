
function saveOptionsToStorage(profileList, defaultProfile) {
    chrome.storage.sync.set({
        profiles: profileList,
        default: defaultProfile
    });
}

window.addEventListener('DOMContentLoaded', init, false);

function init() {
    const configFileSel = document.getElementById('configFile');
    configFileSel.addEventListener('change', handleFileSelect, false);

    const saveAuthBtn = document.getElementById('saveAuth');
    saveAuthBtn.addEventListener('click', saveAuthVals, false);

    const clearAuthBtn = document.getElementById('clearAuth');
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
    const spidVal = document.getElementById('spid').value;
    const idpidVal = document.getElementById('idpid').value;
    const saveAuthBtn = document.getElementById('saveAuth');

    saveAuthBtn.disabled = spidVal == "" || idpidVal == "";
}

function saveAuthVals() {
    const spidVal = document.getElementById('spid').value;
    const idpidVal = document.getElementById('idpid').value;

    const today = new Date();

    chrome.storage.sync.set({spid: spidVal, idpid: idpidVal});
    document.getElementById("optsStatus").innerHTML = "Updated " + today.toLocaleTimeString();
}

function clearAuthVals() {
  document.getElementById('spid').value = "";
  document.getElementById('idpid').value = "";

  saveAuthVals();
}

function saveTermVal() {
    const termVal = document.getElementById('iterm').checked;
    chrome.storage.sync.set({iterm: termVal});
}

function updateTerm(checkedVal) {
    const iTermEl = document.getElementById('iterm');
    iTermEl.addEventListener('click', saveTermVal, false);

    iTermEl.checked = checkedVal;
}

function updateAuthOpts(spidVal, idpidVal) {
    const spidEl = document.getElementById('spid');
    const idpidEl = document.getElementById('idpid');

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
    const defaultSelect = document.getElementById('defaultProfile');

    defaultSelect.onchange = function(e) {
        defaultProfile = e.target.value;
        chrome.storage.sync.set({default: e.target.value});
    }

    if(profileList) {
        profileList.forEach(function(elText) {
            let el = document.createElement("option");
            el.textContent = elText;
            el.value = elText;
            defaultSelect.appendChild(el);
        });
    }
    defaultSelect.value = defaultProfile;
}

function handleFileSelect(evt) {
  const reader = new FileReader();
  console.log(evt.target.files[0])
  reader.readAsText(evt.target.files[0]);

  reader.onload = function(e) {
    const text = reader.result;
    const awsConfig = parseINIString(text);

    localProfiles = [];
    Object.keys(awsConfig).forEach(function(key) {
        let elText = key.replace("profile ", "");
        localProfiles.push(elText);
    });
    chrome.storage.sync.set({profiles: localProfiles});
    enableProfileSelect(localProfiles, localProfiles[0]);
  }
}

function parseINIString(data){
    const regex = {
        section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
        param: /^\s*([^=]+?)\s*=\s*(.*?)\s*$/,
        comment: /^\s*;.*$/
    };
    let value = {};
    const lines = data.split(/[\r\n]+/);
    let section = null;
    lines.forEach(function(line){
        if(regex.comment.test(line)){
            return;
        }else if(regex.param.test(line)){
            let match = line.match(regex.param);
            if(section){
                value[section][match[1]] = match[2];
            }else{
                value[match[1]] = match[2];
            }
        }else if(regex.section.test(line)){
            let match = line.match(regex.section);
            value[match[1]] = {};
            section = match[1];
        }else if(line.length == 0 && section){
            section = null;
        };
    });
    return value;
}
