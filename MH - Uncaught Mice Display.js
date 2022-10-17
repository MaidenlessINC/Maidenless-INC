// ==UserScript==
// @name         MH - Uncaught Mice Display
// @version      1.1.0
// @description  Shows uncaught mice at any location
// @author       MI
// @match        https://www.mousehuntgame.com/*
// @match        https://apps.facebook.com/mousehunt/*
// @icon         https://www.google.com/s2/favicons?domain=mousehuntgame.com
// @grant        none
// @namespace https://greasyfork.org/users/748165
// ==/UserScript==

((function () {
	'use strict';

	/**
	 * Add styles to the page.
	 *
	 * @param {string} styles The styles to add.
	 */
	const addStyles = (styles) => {
		const existingStyles = document.getElementById('maidenless-styles');
		if (existingStyles) {
			existingStyles.innerHTML += styles;
			return;
		}

		const style = document.createElement('style');
		style.id = 'maidenless-styles';
		style.innerHTML = styles;
		document.head.appendChild(style);
	};

	/**
	 * Do something when ajax requests are completed.
	 *
	 * @param {Function} callback    The callback to call when an ajax request is completed.
	 * @param {string}   url         The url to match. If not provided, all ajax requests will be matched.
	 * @param {boolean}  skipSuccess Skip the success check.
	 */
	 const onAjaxRequest = (callback, url = null, skipSuccess = false) => {
		const req = XMLHttpRequest.prototype.open;
		XMLHttpRequest.prototype.open = function () {
			this.addEventListener('load', function () {
				if (this.responseText) {
					let response = {};
					try {
						response = JSON.parse(this.responseText);
					} catch (e) {
						return;
					}

					if (response.success || skipSuccess) {
						if (! url) {
							callback(response);
							return;
						}

						if (this.responseURL.indexOf(url) !== -1) {
							callback(response);
						}
					}
				}
			});
			req.apply(this, arguments);
		};
	};

	/**
	 * POST a request to the server and return the response.
	 *
	 * @param {string} url  The url to post to, not including the base url.
	 * @param {Object} data The data to post.
	 *
	 * @returns {Promise} The response.
	 */
	const doRequest = async (url, formData) => {
		// Build the form for the request.
		const form = new FormData();
		form.append('sn', 'Hitgrab');
		form.append('hg_is_ajax', 1);
		form.append('last_read_journal_entry_id', lastReadJournalEntryId ? lastReadJournalEntryId : 0);
		form.append('uh', user.unique_hash ? user.unique_hash : '');

		// Add in the form data.
		for (const key in formData) {
			form.append(key, formData[key]);
		}

		const requestBody = new URLSearchParams(form).toString();

		const response = await fetch(
			callbackurl ? callbackurl + url  : 'https://www.mousehuntgame.com/' + url,
			{
				method: 'POST',
				body: requestBody,
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			}
		);

		const data = await response.json();
		return data;
	}

	const renderMiceList = (mice) => {
		let markup = '<div class="mh-uncaught-mice-list"><ul>';
		mice.forEach(element => {
			const mhctLink = `https://mhct.win/attractions.php?mouse_name=${ encodeURIComponent(element.name) }`;
			markup += `<li class="mh-uncaught-mice ${ element.is_caught ? 'mh-uncaught-mice-caught' : 'mh-uncaught-mice-uncaught' }">
				<img src="${ element.image }" alt="${ element.name }" title="${ element.name }" />
				<div class="mh-uncaught-mice-caught-crown ${ element.crown }"></div>
				<div class="mh-uncaught-mice-name name">
					<a href="${ mhctLink }"  target="mhct_search" rel="noopener noreferrer">${ element.name }</a>
				</div>
			</li>`;
		});
		markup += '</ul></div>';

		return markup;
	}

	/**
	 * Create or update the uncaught mice display.
	 *
	 * @param {integer} uncaughtCount The number of uncaught mice.
	 */
	const createOrUpdateDisplay = (locations) => {
		const locationWrapper = document.querySelector('.mousehuntHud-environmentIconWrapper');
		if (! locationWrapper ) {
			return;
		}

		if (! (locations && user && user.environment_type && user.environment_name)) {
			return false;
		}

		const locationStats = locations.findIndex((location) => {
			return location.type === user.environment_type;
		});

		if (locationStats === -1 || ! locations[locationStats] ) {
			return false;
		}

		const uncaughtCount = locations[locationStats].total - locations[locationStats].caught;

		let caughtBox = document.querySelector('.mi-uncaught-box');
		if (caughtBox) {
			caughtBox.innerText = uncaughtCount;
			caughtBox.onclick = null;
		} else {
			caughtBox = document.createElement('div');
			caughtBox.classList.add('mi-uncaught-box');
			caughtBox.innerText = uncaughtCount;
			locationWrapper.appendChild(caughtBox);
		}

		// merge all the arrays in the subgroup
		if (locations[locationStats].subgroups) {
			const mice = locations[locationStats].subgroups.reduce((acc, val) => acc.concat(val.mice), []);

			caughtBox.onclick = () => {
				var popup = new jsDialog();
				popup.setIsModal(false);
				popup.setTemplate('default');
				popup.addToken('{*title*}', `Mice in ${ user.environment_name }`);
				popup.addToken('{*content*}', renderMiceList(mice));
				popup.show();
			}
		}

		if (0 === uncaughtCount) {
			caughtBox.classList.add('mi-caught-all');
			catchBox.innerText = '🎉️';
		} else {
			caughtBox.classList.remove('mi-caught-all');
		}
	}

	/**
	 * Render the uncaught mice.
	 */
	const getDataAndRenderCount = () => {
		// Grab all mice data.
		doRequest(
			'managers/ajax/pages/page.php',
			{
				'page_class': 'HunterProfile',
				'page_arguments[tab]:': 'mice',
				'page_arguments[sub_tab]' : 'location',
			}
		).then((data) => {
			// Behold! The Waterfall of Validation!
			if (! (
				data &&
				data.success &&
				data.page &&
				data.page.tabs &&
				data.page.tabs.mice &&
				data.page.tabs.mice.subtabs &&
				data.page.tabs.mice.subtabs[1] &&
				data.page.tabs.mice.subtabs[1].mouse_list &&
				data.page.tabs.mice.subtabs[1].mouse_list.categories
			)) {
				return;
			}

			createOrUpdateDisplay(data.page.tabs.mice.subtabs[1].mouse_list.categories);
		});
	}

	addStyles(`.mi-uncaught-box {
		position: absolute;
		width: 20px;
		height: 20px;
		border-radius: 4px;
		left: 2px;
		bottom: 3px;
		background-color: #d9cca3;
		font-size: 11px;
		padding: 0;
		vertical-align: middle;
		text-shadow: 0 0 1px #ae9b6d;
		color: #462402;
		text-align: center;
		line-height: 20px;
		font-weight: 700;
		border-bottom-right-radius: 0;
		border-top-left-radius: 0;
		box-shadow: 2px 2px 2px #e5dac0 inset, -2px -2px 2px #9f9171 inset;
		cursor: pointer;
	}

	.mi-caught-all {
		background-color: #fff7b3;
	}

	.mh-uncaught-mice-list ul {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-evenly;
		align-items: stretch;
	}

	.mh-uncaught-mice {
		width: 95px;
		border: 1px solid #9b9b9b;
		margin: 2px;
		padding-top: 10px;
		border-radius: 5px;
		position: relative;
		text-align: center;
	}

	.mh-uncaught-mice-uncaught {
		background-color: #e0e0e0;
	}

	.mh-uncaught-mice-name.name {
		padding: 5px;
	}

	.mh-uncaught-mice-caught-crown.bronze,
	.mh-uncaught-mice-caught-crown.silver,
	.mh-uncaught-mice-caught-crown.gold,
	.mh-uncaught-mice-caught-crown.platinum,
	.mh-uncaught-mice-caught-crown.diamond {
		position: absolute;
		top: 0;
		right: 0;
		height: 30px;
		width: 30px;
		background-color: #fff;
		background-position: center center;
		background-repeat: no-repeat;
		background-size: 30px 30px;
		border-bottom-left-radius: 5px;
		border-bottom: 1px solid #b1b1b1;
		border-left: 1px solid #b1b1b1;
		border-top-right-radius: 8px;
		box-shadow: -1px 1px 0 1px white;

	}

	.mh-uncaught-mice-caught-crown.bronze {
		background-image: url('https://www.mousehuntgame.com/images/ui/crowns/crown_bronze.png');
	}

	.mh-uncaught-mice-caught-crown.silver {
		background-image: url('https://www.mousehuntgame.com/images/ui/crowns/crown_silver.png');
	}

	.mh-uncaught-mice-caught-crown.gold {
		background-image: url('https://www.mousehuntgame.com/images/ui/crowns/crown_gold.png');
	}

	.mh-uncaught-mice-caught-crown.platinum {
		background-image: url('https://www.mousehuntgame.com/images/ui/crowns/crown_platinum.png');
	}

	.mh-uncaught-mice-caught-crown.diamond {
		background-image: url('https://www.mousehuntgame.com/images/ui/crowns/crown_diamond.png');
	}

	.mh-uncaught-mice-caught-count {
		display: inline-block;
		vertical-align: top;
		margin-top: 3px;
	}
	`);

	// Fire off the initial render.
	getDataAndRenderCount();

	// On horn or traveling, update the count.
	onAjaxRequest(getDataAndRenderCount, '/managers/ajax/turns/activeturn.php');
	onAjaxRequest(getDataAndRenderCount, '/managers/ajax/users/changeenvironment.php'); // Kind of like the change page.
})());
