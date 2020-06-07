function init() {
    var launchBtn = document.getElementById('launch');
    var loadBtn = document.getElementById('load');
    var configFileSel = document.getElementById('configFile');
    var defaultSelect = document.getElementById('defaultProfile');
    var profileName = document.getElementById('profileName');

    launchBtn.onclick = launchCLI;
    configFileSel.addEventListener('change', handleFileSelect, false);
    profileName.onkeyup = enableLaunchBtn;
}

function enableLaunchBtn(e) {
    var launchBtn = document.getElementById('launch');
    var profileName = document.getElementById('profileName');

    launchBtn.disabled = profileName.value == "";
}

function launchCLI(e) {
    var profileName = document.getElementById('profileName');
    var actionText = document.getElementById('actionText');

    actionText.innerHTML = "Launching samule://" + profileName.value;

    window.open("samule://" + profileName.value,'_samule');
}

function loadProfiles(element) {
}

function handleFileSelect(evt) {
    document.getElementById('filePanel').className = "hidden";

  var reader = new FileReader();

  reader.onload = function(e) {
    var text = reader.result;
    var awsConfig = parseINIString(text);
    var defaultSelect = document.getElementById('defaultProfile');
    defaultSelect.className = "visible";
    defaultSelect.onchange = function(e) {
        document.getElementById('profileName').value = e.target.value;
        enableLaunchBtn(e);
    }

    Object.keys(awsConfig).forEach(function(key) {
        var elText = key.replace("profile ", "");
        var el = document.createElement("option");
        el.textContent = elText
        el.value = elText;
        defaultSelect.appendChild(el);
    });

    var profileName = document.getElementById('profileName');
    if(profileName.value == "") {
        profileName.value = defaultSelect.value;
        enableLaunchBtn(e);
    }

  }
  reader.readAsText(evt.target.files[0]);
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
