// Cloud security: prevention vs reaction.
//
// Two levers, both from real work: an Org Policy constraint that refuses the
// bad config at creation, and CMDB ownership that decides whether a finding
// reaches a human or a shared mailbox. The exposure window is the output.
//
// CSP: external file, script-src 'self'. No eval, no inline handlers.
(function () {
  var root = document.querySelector('[data-prevent]');
  if (!root) return;

  var policyBtn = root.querySelector('[data-policy]');
  var cmdbBtn = root.querySelector('[data-cmdb]');
  var deployBtn = root.querySelector('[data-deploy]');
  var tl = root.querySelector('[data-timeline]');
  var outcome = root.querySelector('[data-outcome]');

  var policy = false; // Org Policy constraint enforced
  var cmdb = true; // project mapped to a business app + owner

  function steps() {
    if (policy) {
      return {
        rows: [
          ['T+0s', 'Deploy requested: storage bucket with public access.', 'ok'],
          ['T+0s', 'Org Policy constraint evaluates the request at creation.', 'ok'],
          ['T+0s', 'DENIED. The resource is never created.', 'ok'],
          ['—', 'No finding. No ticket. Nobody is paged. Nothing to remediate.', 'ok'],
        ],
        outcome: { text: 'exposure window: none. the misconfiguration could not exist.', cls: 'good' },
      };
    }
    var rows = [
      ['T+0s', 'Deploy requested: storage bucket with public access.', 'bad'],
      ['T+0s', 'Created. Publicly readable, right now, in production.', 'bad'],
      ['T+6h', 'CSPM scan (Wiz) detects the misconfiguration. It already exists.', 'bad'],
    ];
    if (cmdb) {
      rows.push(['T+6h', 'Project is mapped in the CMDB. Finding routes to the owning team.', 'ok']);
      rows.push(['T+2d', 'Owner remediates. Bucket locked down.', 'ok']);
      return {
        rows: rows,
        outcome: { text: 'exposure window: ~2 days. detected, routed, fixed.', cls: 'bad' },
      };
    }
    rows.push(['T+6h', 'Project has no CMDB owner. Finding lands in a shared mailbox.', 'bad']);
    rows.push(['T+3w', 'Someone eventually notices. Or does not.', 'bad']);
    return {
      rows: rows,
      outcome: {
        text: 'exposure window: ~3 weeks. this is what "1,100+ projects with no owner" costs.',
        cls: 'bad',
      },
    };
  }

  function render(fired) {
    if (!fired) {
      tl.innerHTML = '';
      var li = document.createElement('li');
      li.className = 'tl-empty';
      li.textContent = 'set the levers, then deploy the bad config.';
      tl.appendChild(li);
      outcome.className = 'outcome';
      outcome.textContent = '';
      outcome.hidden = true;
      return;
    }
    var s = steps();
    tl.innerHTML = '';
    s.rows.forEach(function (r) {
      var li = document.createElement('li');
      li.className = r[2] === 'ok' ? 'step-ok' : 'step-bad';
      var when = document.createElement('span');
      when.className = 'tl-when';
      when.textContent = r[0];
      var what = document.createElement('span');
      what.textContent = r[1];
      li.appendChild(when);
      li.appendChild(what);
      tl.appendChild(li);
    });
    outcome.hidden = false;
    outcome.className = 'outcome ' + s.outcome.cls;
    outcome.textContent = s.outcome.text;
  }

  function labels() {
    policyBtn.textContent = policy ? 'org policy: enforced' : 'org policy: not enforced';
    policyBtn.setAttribute('aria-pressed', String(policy));
    cmdbBtn.textContent = cmdb ? 'cmdb owner: mapped' : 'cmdb owner: unmapped';
    cmdbBtn.setAttribute('aria-pressed', String(cmdb));
    // With the constraint on, ownership never comes up — nothing gets created.
    cmdbBtn.disabled = policy;
  }

  var fired = false;

  policyBtn.addEventListener('click', function () {
    policy = !policy;
    labels();
    if (fired) render(true);
  });
  cmdbBtn.addEventListener('click', function () {
    cmdb = !cmdb;
    labels();
    if (fired) render(true);
  });
  deployBtn.addEventListener('click', function () {
    fired = true;
    render(true);
  });

  labels();
  render(false);
})();
