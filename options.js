'use strict';

/* eslint-env browser */

document.addEventListener('DOMContentLoaded', async () => {
  const { GITHUB_ADDON_TOKEN } = await browser.storage.local.get('GITHUB_ADDON_TOKEN');
  document.querySelector('#token').value = GITHUB_ADDON_TOKEN;
});

document.querySelector('form').addEventListener('submit', (e) => {
  e.preventDefault();
  browser.storage.local.set({
    GITHUB_ADDON_TOKEN: document.querySelector('#token').value,
  });
});
