// ==UserScript==
// @name         MH - Minluck & CRE tool v2.0 (new)
// @description  Shows hunt statistics on the camp page
// @author       Chromatical
// @match        https://www.mousehuntgame.com/*
// @match        https://apps.facebook.com/mousehunt/*
// @icon         https://www.google.com/s2/favicons?domain=mousehuntgame.com
// @version      3.3.0
// @grant        none
// @namespace https://greasyfork.org/users/748165
// @require      https://cdn.jsdelivr.net/npm/minlucks@2023.6.1/minlucks.js
// ==/UserScript==

// Credits:
// tsitu and contributors - Main CRE ideation and realisation
// selianth - Minluck spreadsheet
// Chromatical - Ideation and realisation
// Kuhmann and Neb - Maintenance and QA
// Pew Pew - Script and rewrite to ease importing from spreadsheet
// Leppy - Addition of special modifiers
// Xellis - Addition of fallback that prevents MiniCRE from opening.
// and anyone else we may have missed :peepolove:

//User Settings-----------------------------
//var turn_red_when = 60; //Turns red when your CR falls below it, in % Deprecated, set it with the tool nox now (click on "i");
//User Settings End-------------------------

(function() {
    if (document.getElementsByClassName("trapImageView-trapAuraContainer")[0] && document.getElementById("mousehuntContainer").className.includes("PageCamp")) {
        render();
        trapChangeListener()
    }
})();

$(document).ajaxStop(function() {
    var trapContainer = document.getElementsByClassName("trapImageView-trapAuraContainer")[0]
    if (document.getElementsByClassName("min-luck-container")[0]) {
        return;
    } else if (trapContainer && document.getElementById("mousehuntContainer").className.includes("PageCamp")) {
        render();
    }
});

const allMiceInfo = window.minlucks;

var allType = ['Arcane', 'Draconic', 'Forgotten', 'Hydro', 'Parental', 'Physical', 'Shadow', 'Tactical', 'Law', 'Rift'];

var dragonbaneCharmMice = new Set([
    "Dragon",
    "Dragoon",
    "Ful'Mina, The Mountain Queen",
    "Thunder Strike",
    "Thundering Watcher",
    "Thunderlord",
    "Violet Stormchild",
    "Fuzzy Drake",
    "Cork Defender",
    "Burly Bruiser",
    "Corky, the Collector",
    "Horned Cork Hoarder",
    "Rambunctious Rain Rumbler",
    "Corkataur",
    "Steam Sailor",
    "Warming Wyvern",
    "Vaporior",
    "Pyrehyde",
    "Emberstone Scaled",
    "Mild Spicekin",
    "Sizzle Pup",
    "Smoldersnap",
    "Bearded Elder",
    "Ignatia",
    "Cinderstorm",
    "Bruticus, the Blazing",
    "Stormsurge, the Vile Tempest",
    "Kalor'ignis of the Geyser",
    "Tiny Dragonfly",
    "Lancer Guard",
    "Dragonbreather",
    "Regal Spearman",
    "Paragon of Dragons",
    "Empyrean Javelineer"
]);

var SSSSTMice = new Set([
    "Barmy Gunner",
    "Pirate",
    "Corrupt Commodore",
    "Buccaneer",
    "Dread Pirate Mousert",
    "Deranged Deckhand",
    "Pirate Anchor",
    "Admiral Arrrgh",
    "Captain Cannonball",
    "Ghost Pirate Queen",
    "Scorned Pirate",
    "Suave Pirate",
    "Cutthroat Pirate",
    "Cutthroat Cannoneer",
    "Scarlet Revenger",
    "Mairitime Pirate",
    "Admiral Cloudbeard",
    "Peggy the Plunderer"
]);

var weremiceMice = new Set([
    "Night Shift Materials Manager",
    "Werehauler",
    "Wealthy Werewarrior",
    "Mischievous Wereminer",
    "Alpha Weremouse",
    "Reveling Lycanthrope",
    "Wereminer"
]);

var cosmicCritterMice = new Set([
    "Hypnotized Gunslinger",
    "Arcane Summoner",
    "Night Watcher",
    "Cursed Taskmaster",
    "Meteorite Golem",
    "Meteorite Mystic"
]);

var riftBases = new Set([
    "Attuned Enerchi Induction Base",
    "Clockwork Base",
    "Elixir Exchanger Base",
    "Enerchi Induction Base",
    "Fissure Base",
    "Fracture Base",
    "Mist Meter Regulator Base",
    "Prestige Base",
    "Rift Base",
    "Rift Mist Diffuser Base"
]);

var weaponName;
var baseName;
var charmName;
var baitName;
var locationName;
var trapPowerType;
var basicTrapPower;
var basicTrapPowerBonus;
var basicTrapPowerTotal;
var basicTrapLuck;
var trapPowerBoost;
var riftLuckCodex;

function render() {
    const div = document.createElement("div");
    div.className = "min-luck-container";
    div.style.position = "absolute";
    weaponName = user.weapon_name;
    if (weaponName == "Smoldering Stone Sentinel Trap") {
        div.style.top = "1px";
        div.style.right = "10px"
    } else {
        div.style.top = "7px";
        div.style.right = "7px";
    }

    const luck_btn = document.createElement("img");
    luck_btn.src = 'https://www.mousehuntgame.com/images/ui/camp/trap/stat_luck.png?asset_cache_version=2'
    luck_btn.className = "min-luck-button"
    luck_btn.style.width = "20px"
    luck_btn.style.height = "20px"
    luck_btn.onclick = function() {
        getData()
    }

    div.appendChild(luck_btn);
    const trap_container = document.getElementsByClassName("trapImageView-trapAuraContainer")[0]
    trap_container.insertAdjacentElement("afterend", div);
    colourClover();
}

function getData() {
    return new Promise((resolve, reject) => {
        weaponName = user.weapon_name;
        baseName = user.base_name;
        charmName = user.trinket_name;
        baitName = user.bait_name;
        trapPowerType = user.trap_power_type_name;
        // locationName = user.environment_name // For some reason this is not updated upon travelling.
        let locationElem = document.getElementsByClassName("mousehuntHud-environmentName")[0];
        if (!locationElem) { // This does not exist on old hud
            locationName = document.getElementsByClassName("hud_location")[0].innerText;
        } else {
            locationName = locationElem.innerText;
        }
        logUserInfo();
        hgPromise(hg.utils.UserInventory.getItem, 'rift_luck_codex_stat_item').then(response => riftLuckCodex = (response.quantity == 1));

        var powerContainer = document.getElementsByClassName("campPage-trap-trapStat power")[0];
        getTrapStat(powerContainer);
        basicTrapPowerBonus = user.trap_power_bonus; // 0.77 for 77%
        basicTrapPowerTotal = user.trap_power;
        basicTrapLuck = user.trap_luck;

        if (calcTrapTotalPower(basicTrapPower, basicTrapPowerBonus) != basicTrapPowerTotal) {
            logger("WARNING: Displayed trap power is " + basicTrapPowerTotal + " while the calculated trap power is " + calcTrapTotalPower(basicTrapPower, basicTrapPowerBonus));
        }
        //if (weapon == "S.S. Scoundrel Sleigher Trap" || weapon.includes("Anniversary") || weapon == "Zugzwang's Ultimate Move" || weapon == "Moonbeam Barrier Trap"){
        // alert("The extra stats from this weapon has not been factored in!")
        // }
        // if (charm == "Dragonbane Charm" || charm == "Super Dragonbane Charm" || charm == "Ultimate Charm" || charm == "EMP400 Charm"){
        //     alert("The extra stats from this charm has not been factored in!")
        // }
        postReq("https://www.mousehuntgame.com/managers/ajax/users/getmiceeffectiveness.php",
            `sn=Hitgrab&hg_is_ajax=1&uh=${user.unique_hash}`
        ).then(async res => {
            try {
                var response = JSON.parse(res.responseText);
                if (response) {
                    var effect = ["Effortless", "Easy", "Moderate", "Challenging", "Difficult", "Overpowering", "Near Impossible", "Impossible"]
                    var tem_list = []
                    for (var i = 0; i < effect.length; i++) {
                        if (response.effectiveness[effect[i]]) {
                            for (var j = 0; j < response.effectiveness[effect[i]].mice.length; j++) {
                                tem_list.push(response.effectiveness[effect[i]].mice[j].name)
                            }
                        }
                    }
                    const p = await renderBox(tem_list)
                        .then(res => {
                            var table = document.getElementById("chro-minluck-table")
                            sortTable(table, 1, 2);
                        });
                    resolve()
                }
            } catch (error) {
                console.error(error.stack);
            }
        });
    })
}

function getTrapStat(element) {
    basicTrapPower = 0;
    trapPowerBoost = 0;
    element.getElementsByClassName("math")[0].querySelectorAll(".campPage-trap-trapStat-mathRow").forEach(el => {
        let value = el.getElementsByClassName("campPage-trap-trapStat-mathRow-value")[0].textContent;
        // We must extract bonus first, otherwise all bonuses will be applied to raw
        if (value.match(/%/g)) {
        } else if (value.match(/[0-9,]+/g)) {
            if (el.getElementsByClassName("campPage-trap-trapStat-mathRow-name")[0].textContent == "Your trap is receiving a boost!") {
                // trap power boost is applied at the end in the CR formula.
                if (locationName != "Zugzwang's Tower") {
                    // We do not want to get the ZT power boost value as we want to calculate it manually.
                    trapPowerBoost += Number(value.match(/[0-9]/g).join(""));
                }
            } else if (el.getElementsByClassName("campPage-trap-trapStat-mathRow-name")[0].textContent == "Your trap is weakened!") {
                // trap power weakening is applied at the end in the CR formula.
                if (locationName != "Zugzwang's Tower") {
                    // We do not want to get the ZT power weakening value as we want to calculate it manually.
                    trapPowerBoost -= Number(value.match(/[0-9]/g).join(""));
                }
            } else {
                // not a boost or weakening
                basicTrapPower += Number(value.match(/[0-9]/g).join(""));
            }
        }
    })
}

function renderBox(list) {
    return new Promise((resolve, reject) => {
        document
            .querySelectorAll("#minluck-list")
            .forEach(el => el.remove())

        var power = Number(document.getElementsByClassName("campPage-trap-trapStat power")[0].children[1].innerText.match(/[0-9]/g).join(""))
        var luck = Number(document.getElementsByClassName("campPage-trap-trapStat luck")[0].children[1].innerText)
        var powerType = document.getElementsByClassName("campPage-trap-trapStat power")[0].children[1].innerText.match(/[a-zA-Z]+/g)[0];

        const div = document.createElement("div");
        div.id = "minluck-list";
        div.style.backgroundColor = "#F5F5F5";
        div.style.position = "fixed";
        div.style.zIndex = "9999";
        var vwvh = localStorage.getItem("Chro-minluck-vwvh")
        var turnRed;
        if (vwvh) {
            var position = JSON.parse(vwvh).split(",");
            div.style.left = position[0] + "vw";
            div.style.top = position[1] + "vh";
            turnRed = Number(position[2]);
        } else {
            div.style.left = "35vw";
            div.style.top = "28vh";
            turnRed = 60;
            localStorage.setItem("Chro-minluck-vwvh", JSON.stringify("35,28,60"));
        };
        div.style.border = "solid 3px #696969";
        div.style.borderRadius = "20px";
        div.style.padding = "10px";
        div.style.textAlign = "center";
        div.style.minWidth = "207px"

        const buttonDiv = document.createElement("div")
        buttonDiv.id = "button-Div"

        const infoButton = document.createElement("button", {
            id: "info-button"
        });
        infoButton.textContent = "i"
        infoButton.style.marginLeft = "10px"
        infoButton.onclick = function() {
            let position = JSON.parse(localStorage.getItem("Chro-minluck-vwvh")).split(",");
            let mes = prompt("More information can be found at:\nhttps://tsitu.github.io/MH-Tools/cre.html\nLast Updated 10 May 2023\n\n Change tool's position / Set % for red text?\n\n" +
                "Left: " + position[0] + "\nTop: " + position[1] + "\nRed text at: " + position[2] + "%", "35,28,60");
            if (mes == null || mes == "") {
                return
            } else {
                localStorage.setItem("Chro-minluck-vwvh", JSON.stringify(mes));
                renderBox(list);
            }
        }

        const minButton = document.createElement("button", {
            id: "minimise-button"
        });
        minButton.textContent = "-"
        minButton.style.cursor = "pointer"
        minButton.style.marginLeft = "5px"
        minButton.onclick = function() {
            if (minButton.textContent == "-") {
                document.getElementById("chro-minluck-table").style.display = "none"
                document.getElementById("button-Div").style.float = "right"
                //$(".maptain-tool-info")[0].style.marginLeft = "0px"
                minButton.textContent = "+"
            } else if (minButton.textContent == "+") {
                document.getElementById("chro-minluck-table").style.display = ""
                document.getElementById("button-Div").style.float = ""
                //$(".maptain-tool-info")[0].style.marginLeft = "17px"
                minButton.textContent = "-"
            }
        }

        const closeButton = document.createElement("button", {
            id: "close-button"
        });
        closeButton.textContent = "x";
        closeButton.style.marginLeft = "5px"
        closeButton.onclick = function() {
            document.body.removeChild(div);
        };

        const setupInfo = document.createElement("div")
        setupInfo.className = "setup-info"
        setupInfo.textContent = "Catch Rate Estimator"
        setupInfo.style.textAlign = "Left"
        setupInfo.style.fontWeight = "bold"
        setupInfo.style.float = "left"
        setupInfo.style.marginLeft = "5px"

        const powerInfo = document.createElement("div")
        powerInfo.className = "power-info"
        powerInfo.textContent = "Power: ".concat(power)
        powerInfo.style.fontWeight = "normal"

        const luckInfo = document.createElement("div")
        luckInfo.className = "luck-info"
        luckInfo.textContent = "Luck: ".concat(luck);
        luckInfo.style.fontWeight = "normal"

        const locInfo = document.createElement("div")
        locInfo.className = "loc-info"
        if (locationName == "Bountiful Beanstalk"){
        locInfo.textContent = "Catch Rates might be a little off as this is a new location.";}
        else {locInfo.textContent = "Location: ".concat(locationName);}
        locInfo.style.fontWeight = "normal"

        setupInfo.appendChild(locInfo);
        setupInfo.appendChild(powerInfo);
        setupInfo.appendChild(luckInfo);

        const table = document.createElement("table");
        table.id = "chro-minluck-table"
        table.style.textAlign = "left";
        table.style.borderSpacing = "1em 0";
        table.style.paddingTop = "5px"

        const miceheader = document.createElement("th");
        miceheader.innerText = "Mouse Name"
        miceheader.style.fontWeight = "bold"
        const minluckheader = document.createElement("th");
        minluckheader.innerText = "Minluck"
        minluckheader.style.textAlign = "center"
        minluckheader.style.fontWeight = "bold"
        const crheader = document.createElement("th");
        crheader.innerText = "CRE"
        crheader.style.textAlign = "center"
        crheader.style.fontWeight = "bold"

        table.appendChild(miceheader);
        table.appendChild(minluckheader);
        table.appendChild(crheader);
        for (var i = 0; i < list.length; i++) {
            var row = document.createElement("tr");
            row.className = "chro-minluck-row"
            var mouseName = document.createElement("td");
            mouseName.innerText = list[i];
            var mouseNameConverted = list[i];
            var power_index = allType.indexOf(powerType);

            var cr_string, minluck_string;
            var mouse_info = allMiceInfo[mouseNameConverted];
            if (mouse_info) {
                var mice_power = mouse_info.power;
                var mice_eff = mouse_info.effs[power_index];
                cr_string = convertToCR(mouseNameConverted, mice_power, mice_eff);
                minluck_string = mouseMinluck(mouseNameConverted, mice_power, mice_eff);
            } else {
                // Mouse not found in info list, credit to Xellis
                cr_string = minluck_string = 'Unknown';
            }

            //minluck----
            var minLuck = document.createElement("td");
            minLuck.className = "chro-minluck-data";
            minLuck.style.textAlign = "center";
            minLuck.innerText = minluck_string;
            if (luck >= minluck_string) {
                minLuck.style.color = "#228B22"
            }

            //catch rate-------
            var cR = document.createElement("td");
            cR.style.textAlign = "center"
            cR.innerText = cr_string;
            var cr_number = (parseInt(cr_string))
            if (cr_string == "100.00%") {
                cR.style.color = "#228B22"
            } else if (cr_number <= turnRed) {
                cR.style.color = "#990000"
            }

            row.appendChild(mouseName);
            row.appendChild(minLuck);
            row.appendChild(cR);
            table.appendChild(row);
        }

        buttonDiv.appendChild(infoButton);
        buttonDiv.appendChild(minButton);
        buttonDiv.appendChild(closeButton);
        div.appendChild(setupInfo);
        div.appendChild(buttonDiv)
        //div.appendChild(minluck_title);
        div.appendChild(table);
        document.body.appendChild(div);
        dragElement(div);
        resolve();
    })
}

// Sorting on minluck (desc) and CR (asc)
function sortTable(table_id, sortColumn1, sortColumn2) {
    var rowData = table_id.getElementsByTagName('tr');
    for (var i = 0; i < rowData.length - 1; i++) {
        for (var j = 0; j < rowData.length - (i + 1); j++) {
            var sortValue1 = Number(rowData.item(j).getElementsByTagName('td').item(sortColumn1).innerHTML.replace(/[^0-9\.]+/g, ""));
            var sortValue2 = Number(rowData.item(j + 1).getElementsByTagName('td').item(sortColumn1).innerHTML.replace(/[^0-9\.]+/g, ""));
            var sortValue3 = Number(rowData.item(j).getElementsByTagName('td').item(sortColumn2).innerHTML.replace(/[^0-9\.]+/g, ""));
            var sortValue4 = Number(rowData.item(j + 1).getElementsByTagName('td').item(sortColumn2).innerHTML.replace(/[^0-9\.]+/g, ""));

            if (sortValue1 < sortValue2 || (sortValue1 === sortValue2 && sortValue3 > sortValue4)) {
                table_id.insertBefore(rowData.item(j + 1), rowData.item(j));
            }
        }
    }
}

function postReq(url, form) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.onreadystatechange = function() {
            if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                resolve(this);
            }
        };
        xhr.onerror = function() {
            reject(this);
        };
        xhr.send(form);
    });
}

function dragElement(elmnt) {
    var pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;
    if (document.getElementById(elmnt.id + "header")) {
        // if present, the header is where you move the DIV from:
        document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
    } else {
        // otherwise, move the DIV from anywhere inside the DIV:
        elmnt.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function mouseMinluck(mouseName, mouse_power, eff) {
    eff = eff / 100;
    var adjustedMP = specialMPEff(mouseName, mouse_power, eff)[0];
    var adjustedEff = specialMPEff(mouseName, mouse_power, eff)[1];

    // Can't evalute infinity symbol, so was replaced with 9999 as minluck instead
    var infinitySym = String.fromCharCode(0x221E)
    if (adjustedEff === 0) {
        return infinitySym;
    }

    // Credits to Beeejk and Neb for minluck formula refinement to handle floats like MH does
    var minluck = Math.ceil(Math.ceil(Math.sqrt(adjustedMP / 2)) / Math.min(adjustedEff, 1.4));
    if (minluck >= 9999) {
        return infinitySym;
    } else {
        if (2 * Math.pow(Math.floor(Math.min(1.4, adjustedEff) * minluck), 2) >= adjustedMP) {
            return minluck
        } else {
            minluck = minluck + 1
            return minluck
        };
    }
};

// Credits to Leppy for including this section to handle special effects.
// Credit to tsitu's MH-Tools for documenting the effects and handling them in code.

function calcTrapTotalPower(rawPower, powerBonus) {
    // "Your trap is receiving a boost!" is applied right at the end.
    var result = rawPower * (1 + powerBonus) + trapPowerBoost;

    // The boost needs to be calculated separately for Zugzwang's Tower as the pincher traps modify the trap power.
    // No need to special treatment for F rift, Twisted Garden until they introduce some traps that have an effect in those areas.
    if (locationName == "Zugzwang's Tower") {
        result *= getZtAmp() / 100
    }
    return Math.ceil(result);
}

function convertToCR(mouseName, mPower, mEff) {
    mEff = mEff / 100;
    var adjustedMP = specialMPEff(mouseName, mPower, mEff)[0];
    var adjustedEff = specialMPEff(mouseName, mPower, mEff)[1];
    var result = CRSpecialBonusAndEffects(mouseName, adjustedMP, adjustedEff)
    result = FinalCRModifier(result, mouseName);
    result = (result * 100).toFixed(2) + '%';
    return result;
}

// mEff already divided by 100;
function CRFormula(power, luck, mPower, mEff) {
    return Math.min(1, (power * mEff + 2 * Math.pow(Math.floor(luck * Math.min(mEff, 1.4)), 2)) / (mPower + power * mEff));
}

// mEff already divided by 100;
// Situations where we adjust the CR based on power/luck/mouse power.
// Any effect that are already displayed in game does not need to be handled here.
function CRSpecialBonusAndEffects(mouseName, mPower, mEff) {
    var adjustedTrapPower = basicTrapPower;
    var adjustedTrapPowerBonus = basicTrapPowerBonus;
    var adjustedTrapLuck = basicTrapLuck;
    if (dragonbaneCharmMice.has(mouseName)) {
        if (charmName == "Dragonbane Charm") {
            // When activated, the charm bursts out a jarring cold blast of air, providing a 300% Power Bonus, making these mice easier to catch.
            logCRAdjustmentInfo(mouseName, "DBC +300% power bonus");
            adjustedTrapPowerBonus += 3;
        } else if (charmName == "Super Dragonbane Charm") {
            // When activated, this super charm bursts out a jarring double cold blast of air, providing a 600% Power Bonus, making these mice much easier to catch.
            logCRAdjustmentInfo(mouseName, "SDBC +600% power bonus");
            adjustedTrapPowerBonus += 6;
        } else if (charmName == "Extreme Dragonbane Charm") {
            // When activated, this extreme charm bursts out a jarring triple cold blast of air, providing a 900% Power Bonus, making these mice a breeze to catch.
            logCRAdjustmentInfo(mouseName, "EDBC +600% power bonus");
            adjustedTrapPowerBonus += 9;
        } else if (charmName == "Ultimate Dragonbane Charm") {
            // When activated, this powerful charm bursts out a jarring quadruple cold blast of air, providing a 1200% Power Bonus, making these mice a breeze to catch.
            logCRAdjustmentInfo(mouseName, "UDBC +1200% power bonus");
            adjustedTrapPowerBonus += 12;
        }
    }
    if (locationName == "Fiery Warpath") {
        if (charmName == "Super Warpath Archer Charm" && ["Desert Archer", "Flame Archer", "Crimson Ranger"].includes(mouseName)) {
            // giving a power bonus against Marching Flame Archers (+50%)
            logCRAdjustmentInfo(mouseName, "Super Warpath Charm +50% power bonus");
            adjustedTrapPowerBonus += 0.5;
        } else if (charmName == "Super Warpath Cavalry Charm" && ["Sand Cavalry", "Sandwing Cavalry"].includes(mouseName)) {
            // giving a power bonus against Marching Flame Cavalry (+50%)
            logCRAdjustmentInfo(mouseName, "Super Warpath Charm +50% power bonus");
            adjustedTrapPowerBonus += 0.5;
        } else if (charmName == "Super Warpath Mage Charm" && ["Inferno Mage", "Magmarage"].includes(mouseName)) {
            // giving a power bonus against Marching Flame Mages (+50%)
            logCRAdjustmentInfo(mouseName, "Super Warpath Charm +50% power bonus");
            adjustedTrapPowerBonus += 0.5;
        } else if (charmName == "Super Warpath Scout Charm" && ["Vanguard", "Sentinel", "Crimson Watch"].includes(mouseName)) {
            // giving a power bonus against Marching Flame Scouts (+50%)
            logCRAdjustmentInfo(mouseName, "Super Warpath Charm +50% power bonus");
            adjustedTrapPowerBonus += 0.5;
        } else if (charmName == "Super Warpath Warrior Charm" && ["Desert Soldier", "Flame Warrior", "Crimson Titan"].includes(mouseName)) {
            // giving a power bonus against Marching Flame Warriors (+50%)
            logCRAdjustmentInfo(mouseName, "Super Warpath Charm +50% power bonus");
            adjustedTrapPowerBonus += 0.5;
        } else if (charmName == "Super Warpath Commander's Charm" &&
            mouseName == " Crimson Commander") {
            // This magical charm both assists in attracting and capturing Crimson Commanders of the Marching Flame
            logCRAdjustmentInfo(mouseName, "Super Warpath Charm +50% power bonus");
            adjustedTrapPowerBonus += 0.5;
        }
    }
    if (locationName == "Whisker Woods Rift") {
        if (charmName == "Taunting Charm" && ["Cyclops Barbarian", "Centaur Ranger", "Tri-dra", "Monstrous Black Widow"].includes(mouseName)) {
            var riftSet = riftCount();
            // Riftwalker set bonus for 2 pieces +20% power bonus
            // Riftwalker set bonus for 3 pieces +20% power bonus and +5 luck
            // Riftstalker set bonus for 2 pieces +40% power bonus
            // Riftstalker set bonus for 3 pieces +40% power bonus and +10 luck
            if (riftSet == 1) {
                if (riftLuckCodex) {
                    logCRAdjustmentInfo(mouseName, "Taunting Charm Riftstalker Set bonus +40% trap power bonus");
                    adjustedTrapPowerBonus += 0.4;
                } else {
                    logCRAdjustmentInfo(mouseName, "Taunting Charm Riftwalker Set bonus +20% trap power bonus");
                    adjustedTrapPowerBonus += 0.2;
                }
            }
            if (riftSet == 2) {
                // If we got a rift weapon and a rift base, the TEM would have already included the power bonus.
                if (riftLuckCodex) {
                    logCRAdjustmentInfo(mouseName, "Taunting Charm Riftstalker Set bonus +10 luck");
                    adjustedTrapLuck += 10;
                } else {
                    logCRAdjustmentInfo(mouseName, "Taunting Charm Riftwalker Set bonus +5 luck");
                    adjustedTrapLuck += 5;
                }
            }
        }
    }
    if (locationName == "Zugzwang's Tower") {
        if (weaponName == "Obvious Ambush Trap") {
            // Obvious Ambush and Blackstone Pass give +1800 Power on corresponding side, -2400 Power on opposite side
            if (mouseName.startsWith("Technic")) {
                logCRAdjustmentInfo(mouseName, "Zugzwang's Tower side specific trap +1800 trap power");
                adjustedTrapPower += 1800;
            } else if (mouseName.startsWith("Mystic")) {
                logCRAdjustmentInfo(mouseName, "Zugzwang's Tower side specific trap -2400 trap power");
                adjustedTrapPower -= 2400;
            }
        } else if (weaponName == "Blackstone Pass Trap") {
            // Obvious Ambush and Blackstone Pass give +1800 Power on corresponding side, -2400 Power on opposite side
            if (mouseName.startsWith("Mystic")) {
                logCRAdjustmentInfo(mouseName, "Zugzwang's Tower side specific trap +1800 trap power");
                adjustedTrapPower += 1800;
            } else if (mouseName.startsWith("Technic")) {
                logCRAdjustmentInfo(mouseName, "Zugzwang's Tower side specific trap -2400 trap power");
                adjustedTrapPower -= 2400;
            }
        } else if (weaponName == "Technic Pawn Pincher") {
            //  Pawn Pinchers give +10920 Power on corresponding Pawn, -60 Power and -5 Luck on opposite Pawn
            if (mouseName == "Technic Pawn") {
                logCRAdjustmentInfo(mouseName, "Zugzwang's Tower pawn pincher trap +10920 trap power");
                adjustedTrapPower += 10920;
                adjustedTrapLuck += 51;
            // } else if (mouseName == "Mystic Pawn") { //Commenting it out entirely because we do not know what it does properly.
            //     logCRAdjustmentInfo(mouseName, "Zugzwang's Tower pawn pincher trap -60 trap power, -5 luck");
            //     adjustedTrapPower -= 60;
            //     adjustedTrapPowerBonus -= 0.05; //Main CRE currently uses -5% power bonus, unsure which is true so following that.
            }
        } else if (weaponName == "Mystic Pawn Pincher") {
            // Pawn Pinchers give +10920 Power on corresponding Pawn, -60 Power and -5 Luck on opposite Pawn
            if (mouseName == "Mystic Pawn") {
                logCRAdjustmentInfo(mouseName, "Zugzwang's Tower pawn pincher trap +10920 trap power");
                adjustedTrapPower += 10920;
                adjustedTrapLuck += 51;
            // } else if (mouseName == "Technic Pawn") { //Commenting it out entirely because we do not know what it does properly.
            //     logCRAdjustmentInfo(mouseName, "Zugzwang's Tower pawn pincher trap -60 trap power, -5 luck");
            //     adjustedTrapPower -= 60;
            //     adjustedTrapPowerBonus -= 0.05; //Main CRE currently uses -5% power bonus, unsure which is true so following that.
            }
        }
        if (charmName == "Rook Crumble Charm" && ["Mystic Rook", "Technic Rook"].includes(mouseName)) {
            // Rook Crumble Charm gives +300% Power Bonus on Rook mice.
            logCRAdjustmentInfo(mouseName, "Zugzwang's Tower rook crumble charm +300% power bonus");
            adjustedTrapPowerBonus += 3;
        }
    }
    if (locationName == "Sand Crypts") {
        if (["King Grub", "King Scarab"].includes(mouseName)) {
            var minigameContainer = document.getElementsByClassName("minigameContainer grubling")[0];
            if (minigameContainer) {
                var saltContainer = minigameContainer.getElementsByClassName("salt_charms")[0];
                console.log(saltContainer);
                if (saltContainer && saltContainer.textContent != "0") {
                    // Weaken the King Grub with Grub Salt charms, and then use a Grub Scent charm to attract it when you're ready!
                    logCRAdjustmentInfo(mouseName, "Sand Crypts salted level " + saltContainer.textContent);
                    mPower = calcSaltedPower(mouseName, mPower, saltContainer.textContent);
                }
            }
        }
    }
    var adjustedTrapPowerTotal = calcTrapTotalPower(adjustedTrapPower, adjustedTrapPowerBonus);
    var result = CRFormula(adjustedTrapPowerTotal, adjustedTrapLuck, mPower, mEff);
    return result;
}

// Situations where we adjust the CR directly without needing power/luck/mouse power.
// Credit to tsitu's MH-Tools for documenting the effects and handling them in code.

// Some need to be factored in for minluck, so they're done separately
function specialMPEff(mouseName, mouse_power, eff) {
    // Special case: Zurreal
    if (locationName == "Crystal Library") {
        if (mouseName == "Zurreal the Eternal" && weaponName != "Zurreal's Folly") {
            // Zurreal's Folly is the only effective weapon against Zurreal the Eternal.
            logCRAdjustmentInfo(mouseName, "Zurreal the Eternal");
            eff = 0;
        }
    }

    // Special cases: Fort Rox
    if (locationName == "Fort Rox") {
        var ballistaContainer = document.getElementsByClassName("fortRoxHUD-fort-upgrade b")[0];
        if (ballistaContainer) {
            if (ballistaContainer.classList[2] == "level_0" && weremiceMice.has(mouseName)) {
                // Level 1 decreases the power of Fort Rox Weremice by 50%. Since we import from selianth's sheet, we need to adjust for level 0.
                logCRAdjustmentInfo(mouseName, "Fort Rox ballista level 0 +100% mouse power");
                mouse_power *= 2;
            }
            if (ballistaContainer.classList[2] == "level_3" && mouseName == "Nightmancer") {
                // Instantly defeats the Nightmancer Mouse.
                logCRAdjustmentInfo(mouseName, "Fort Rox ballista level 3 instant catch");
                mouse_power = 0
                eff = 1;
            }
        }
        var cannonContainer = document.getElementsByClassName("fortRoxHUD-fort-upgrade c")[0];
        if (cannonContainer) {
            if (cannonContainer.classList[2] == "level_0" && cosmicCritterMice.has(mouseName)) {
                // Level 1 decreases the power of Fort Rox Cosmic Critters by 50%. Since we import from selianth's sheet, we need to adjust for level 0.
                logCRAdjustmentInfo(mouseName, "Fort Rox cannon level 0 +100% mouse power");
                mouse_power *= 2;
            }
            if (cannonContainer.classList[2] == "level_3" && mouseName == "Nightfire") {
                // Instantly defeats the Nightfire Mouse.
                logCRAdjustmentInfo(mouseName, "Fort Rox cannon level 3 instant catch");
                mouse_power = 0
                eff = 1;
            }
        }
    }

    // Special cases: Zokor
    // Credit to tsitu and Neb for calculating
    if (locationName == "Zokor") {
        var bossCheck = user.quests.QuestAncientCity.boss;
        if (bossCheck == "defeated") {
            if (mouseName == "Reanimated Carver") {
                mouse_power *= 5/9;
            }
            else {
                mouse_power *= 3/4;
            }
        }
    }

    // Special cases: Instacatch
    if (charmName == "Ultimate Charm") {
        // With this charm equipped, you will catch the very next mouse you encounter - guaranteed!
        logCRAdjustmentInfo(mouseName, "Ultimate Charm");
        mouse_power = 0
        eff = 1;
    }
    if (charmName == "Ultimate Anchor Charm" && locationName == "Sunken City") {
        // With this charm equipped, you will catch the very next mouse you encounter - guaranteed!
        // These Ultimate Anchor Charms only work while diving at the Sunken City.
        logCRAdjustmentInfo(mouseName, "Ultimate Anchor Charm");
        mouse_power = 0
        eff = 1;
    }
    if (charmName == "Sheriff's Badge Charm" && mouseName == "Bounty Hunter") {
        // With a Sheriff's Badge Charm equipped, hunters who encounter a Bounty Hunter Mouse are guaranteed to catch him and bring him to justice
        logCRAdjustmentInfo(mouseName, "Sheriff's Badge Charm");
        mouse_power = 0
        eff = 1; //Might need testing :D
    }
    if (weaponName == "Moonbeam Barrier Trap" && mouseName == "Battering Ram") {
        // This trap has a 100% catch rate against the Battering Ram Mouse.
        logCRAdjustmentInfo(mouseName, "Moonbeam Barrier Trap");
        mouse_power = 0;
    }
    return [mouse_power, eff];
};

function FinalCRModifier(currentCR, mouseName) {
    if (weaponName == "Zugzwang's Ultimate Move") {
        // This trap has a chance to trigger its special effect and instantly outwit and capture a mouse
        // as long as your Tower Amplifier has some charge within the Seasonal Garden and Zugzwang's Tower.
        // This trap has a 50% proc rate
        if (locationName == "Seasonal Garden") {
            var ampContainer = document.getElementsByClassName("seasonalGardenHUD-currentAmplifier-value")[0];
            if (ampContainer && ampContainer.textContent != "0") {
                logCRAdjustmentInfo(mouseName, "Zugzwang's Ultimate Move");
                currentCR += (1 - currentCR) * 0.5;
            }
        } else if (locationName == "Zugzwang's Tower" && getZtAmp() > 0) {
            logCRAdjustmentInfo(mouseName, "Zugzwang's Ultimate Move");
            currentCR += (1 - currentCR) * 0.5;
        }
    }
    if (weaponName.startsWith("Anniversary")) {
        // The Anniversary traps have a 10% chance to instantly catch any mouse!
        logCRAdjustmentInfo(mouseName, "Anniversary Trap");
        currentCR += (1 - currentCR) * 0.1;
    }
    if (weaponName === "S.S. Scoundrel Sleigher Trap" && SSSSTMice.has(mouseName)) {
        // This trap has a chance to instantly capture any pirate mouse.
        // This trap is assumed to have a 33% proc rate
        logCRAdjustmentInfo(mouseName, "S.S. Scoundrel Sleigher Trap");
        currentCR += (1 - currentCR) * 0.33;
    }
    if (locationName == "Fort Rox") {
        var ballistaContainer = document.getElementsByClassName("fortRoxHUD-fort-upgrade b")[0];
        if (ballistaContainer) {
            if ((ballistaContainer.classList[2] == "level_2" || ballistaContainer.classList[2] == "level_3") &&
                weremiceMice.has(mouseName)) {
                // Provides a chance to instantly capture Fort Rox Weremice. (50%)
                logCRAdjustmentInfo(mouseName, "Fort Rox ballista level 2/3 instant catch (50%)");
                currentCR += (1 - currentCR) * 0.5;
            }
        }
        var cannonContainer = document.getElementsByClassName("fortRoxHUD-fort-upgrade c")[0];
        if (cannonContainer) {
            if ((cannonContainer.classList[2] == "level_2" || cannonContainer.classList[2] == "level_3") &&
                cosmicCritterMice.has(mouseName)) {
                // Provides a chance to instantly capture Fort Rox Cosmic Critters. (50%)
                logCRAdjustmentInfo(mouseName, "Fort Rox cannon level 2/3 instant catch (50%)");
                currentCR += (1 - currentCR) * 0.5;
            }
        }
        // TODO: tower mana
    }
    return currentCR;
}

// Adjust the mouse power based on the salt level.
// Credit to tsitu's MH-Tools
function calcSaltedPower(mouseName, mousePower, saltLevel) {
    var saltedPower = mousePower;
    var saltVal = parseInt(saltLevel, 10) || 0;
    if (saltVal > 0 && saltVal <= 50) {
        if (mouseName === "King Grub") {
            saltedPower = 112571 - 27883 * Math.log(saltVal);
        } else if (mouseName === "King Scarab") {
            saltedPower = 777879 - 183425 * Math.log(saltVal);
        }
    }

    return saltedPower;
}

// Return the Zugzwang's Tower amplifier level if we are inside the tower.
// 150% is returned as 150.
function getZtAmp() {
    if (locationName == "Zugzwang's Tower") {
        var ampContainer = document.getElementsByClassName("zuzwangsTowerHUD-currentAmplifier")[0];
        if (ampContainer && ampContainer.textContent.match(/[0-9]+/g)) {
            var result = Number(ampContainer.textContent.match(/[0-9]/g).join(""));
            //logger("Zugzwang's Tower's ampiler is at " + result + "%");
            return result;
        }
    }
    return 0;
}

function logUserInfo() {
    logger(locationName + " / " + weaponName + " / " + baseName + " / " + charmName + " / " + baitName + " / " + trapPowerType)
}

function logCRAdjustmentInfo(mouseName, message) {
    logger(message + ": " + mouseName + " / " + locationName + " / " + weaponName + " / " + baseName + " / " + charmName + " / " + baitName + " / " + trapPowerType)
}

// This function is used for Taunting charm.  Therefore we only look at the weapon and base.
function riftCount() {
    var count = 0;
    if (trapPowerType == "Rift") {
        count += 1;
    }
    if (riftBases.has(baseName)) {
        count += 1;
    }
    return count;
}

// An easy way to turn on/off debugging info.
function logger(message) {
    console.log(message);
}

function trapChangeListener() {
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
        this.addEventListener("load", function() {
            if (this.responseURL === "https://www.mousehuntgame.com/managers/ajax/users/changetrap.php") {
                success: {
                    colourClover()
                }
            }
        })
        originalOpen.apply(this, arguments);
    };
};

async function colourClover() {
    var isOpened;
    var colour;
    var button = $(".min-luck-button")[0];
    document.getElementById("minluck-list") ? isOpened = true : isOpened = false;
    const p = await getData()
        .then(res => {
            var data = $(".chro-minluck-data");
            var count = 0;
            for (var i = 0; i < data.length; i++) {
                data[i].style.color == "rgb(34, 139, 34)" ? count++ : null
            }
            count / data.length == 1 ? colour = "blue" : count / data.length >= 0.5 ? colour = "green" : colour = "red";
            colour == "blue" ? button.style.filter = "hue-rotate(100deg)" : null;
            colour == "red" ? button.style.filter = "hue-rotate(185deg)" : null;
            colour == "green" ? button.style.filter = "hue-rotate(0deg)" : null;
        })
    if (isOpened == false) {
        document
            .querySelectorAll("#minluck-list")
            .forEach(el => el.remove())
    }
}

// Using function by Program#5219
function hgPromise(endpoint, ...args) {
    return new Promise((resolve, reject) => {
        endpoint(...args, response => resolve(response), error => reject(error));
    });
}
