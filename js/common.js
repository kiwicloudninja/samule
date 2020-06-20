var localProfiles;
var defaultProfile;

loadItemsFromStorage();

function loadItemsFromStorage() {
    chrome.storage.sync.get({
        profiles: [],
        default: "default",
        },
        function(items) {
            localProfiles = items.profiles;
            defaultProfile = items.default;
        }
    );
}

console.log(defaultProfile, localProfiles);

export { localProfiles, defaultProfile }
