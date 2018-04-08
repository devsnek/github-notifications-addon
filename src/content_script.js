'use strict';

const tokenPromise = browser.storage.local.get('GITHUB_ADDON_TOKEN')
  .then(({ GITHUB_ADDON_TOKEN }) => GITHUB_ADDON_TOKEN);

const get = async (url) => {
  const token = await tokenPromise;
  const req = await window.fetch(url, {
    headers: {
      Authorization: `token ${token}`,
    },
  });
  return req.json();
};

// http://www.w3.org/TR/AERT#color-contrast
const getTextColor = (hex) => {
  const r = hex.slice(1, 3);
  const g = hex.slice(3, 5);
  const b = hex.slice(5, 7);
  const o = Math.round((
    (parseInt(r, 16) * 299) +
    (parseInt(g, 16) * 587) +
    (parseInt(b, 16) * 114)
  ) / 1000);
  return o > 125 ? '#000000' : '#FFFFFF';
};

const REASONS = {
  assign: ['Assigned'],
  author: ['Author'],
  comment: ['Commentor'],
  invitiation: ['Invite', 'red'],
  manual: ['Subscribed'],
  mention: ['Mentioned', 'red'],
  state_change: [],
  subscribed: [],
  team_mention: ['Team Mentioned', 'red'], // TODO(devsnek): change to `Mentioned (teamname)`
};

const LABEL_CLASS = 'github-notifications-addon-label';

const COLORS = {
  red: '#e11d21',
  blue: '#84b6eb',
};

// <span class="label label-color" style="background-color:#7057ff; color:#ffffff">good first issue</span>
const label = (text, color = COLORS.blue) => {
  const l = document.createElement('span');
  l.className = `label label-color ${LABEL_CLASS}`;
  l.textContent = text;
  Object.assign(l.style, {
    'background-color': color,
    'color': getTextColor(color),
    'margin-right': '4px',
  });
  return l;
};

const observer = new MutationObserver(run);
observer.observe(document.querySelector('#js-pjax-container'), {
  subtree: true,
  childList: true,
});

const handled = new WeakSet();

function run() {
  get('https://api.github.com/notifications').then((notifications) => {
    if (!Array.isArray(notifications))
      return;
    const ns = Array.from(document.querySelectorAll('.js-notification'))
      .map((element) => {
        const text = element.textContent.split('\n').map((t) => t.trim()).filter(Boolean)[0];
        return {
          element,
          text,
          notification: notifications.find((n) => n.subject.title === text),
        };
      }).filter((n) => n.notification && n.element);

    for (const { element, notification } of ns) {
      if (handled.has(element))
        continue;
      handled.add(element);
      const target = element.querySelector('.list-group-item-name');
      const checkUnread = element.querySelector('button[type=submit]');
      const checkUnreadAll = element.parentElement.parentElement.querySelector('button');
      const labels = new Set();

      const removeLabels = () => {
        for (const l of labels) {
          l.remove();
          labels.delete(l);
        }
      };

      checkUnread.addEventListener('click', removeLabels);
      checkUnreadAll.addEventListener('click', removeLabels);

      const [text, color] = REASONS[notification.reason];
      if (text) {
        const el = label(text, COLORS[color || 'blue']);
        target.appendChild(el);
        labels.add(el);
      }

      // TODO(devsnek): when github releases graphql for events/notifications
      // roll label information into the first request to avoid delays etc.
      get(notification.subject.url).then(({ labels: l }) => {
        for (let { name, color: c } of l) {
          c = `#${c}`;
          const el = label(name, c);
          labels.add(el);
          target.appendChild(el);
        }
      });
    }
  });
}

run();
