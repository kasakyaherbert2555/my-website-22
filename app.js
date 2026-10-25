/* Two Hill Restaurant: cart, checkout and delivery tracking (no server needed) */
(function () {
  var K = 'th_cart', O = 'th_order';
  var ZONES = {
    campus: { n: 'UCU campus and halls', fee: 1000, min: 15 },
    gate:   { n: 'Around UCU gate and hostels', fee: 1500, min: 20 },
    town:   { n: 'Mukono town and Central Market', fee: 2000, min: 30 },
    nam:    { n: 'Namilyango', fee: 4000, min: 45 }
  };
  var PAY = { mtn: 'MTN Mobile Money', airtel: 'Airtel Money', card: 'Bank card (Visa / Mastercard)', paypal: 'PayPal', cash: 'Cash on delivery' };
  var $ = function (s) { return document.querySelector(s); };
  var get = function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch (e) { return d; } };
  var set = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  var fmt = function (n) { return 'UGX ' + Number(n).toLocaleString('en-US'); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var cart = function () { return get(K, []); };

  function badge() {
    var n = cart().reduce(function (a, i) { return a + i.q; }, 0);
    document.querySelectorAll('.cart-count').forEach(function (e) { e.textContent = n; });
  }
  function toast(t) {
    var d = $('#toast');
    if (!d) { d = document.createElement('div'); d.id = 'toast'; d.setAttribute('role', 'status'); document.body.appendChild(d); }
    d.textContent = t; d.className = 'show';
    clearTimeout(toast.t); toast.t = setTimeout(function () { d.className = ''; }, 1800);
  }

  /* 1. Tap "Add" on any food, drink or combo */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.add'); if (!b) return;
    var c = cart(), f = c.filter(function (i) { return i.name === b.dataset.name; })[0];
    if (f) f.q++; else c.push({ name: b.dataset.name, price: +b.dataset.price, q: 1 });
    set(K, c); badge(); toast(b.dataset.name + ' added to cart');
  });

  /* 2. Cart and checkout page */
  function renderCart() {
    var c = cart(), body = $('#cart-body'); if (!body) return;
    $('#empty').hidden = c.length > 0; $('#checkout-wrap').hidden = c.length === 0;
    body.innerHTML = c.map(function (i, x) {
      return '<tr><td>' + esc(i.name) + '</td><td>' + fmt(i.price) + '</td><td><span class="qty">' +
        '<button type="button" data-act="dec" data-i="' + x + '" aria-label="Fewer">-</button><b>' + i.q +
        '</b><button type="button" data-act="inc" data-i="' + x + '" aria-label="More">+</button></span></td><td>' +
        fmt(i.price * i.q) + '</td><td><button type="button" class="link" data-act="del" data-i="' + x + '">Remove</button></td></tr>';
    }).join('');
    var sub = c.reduce(function (a, i) { return a + i.price * i.q; }, 0), z = ZONES[$('#zone').value];
    $('#sub').textContent = fmt(sub); $('#fee').textContent = fmt(c.length ? z.fee : 0);
    $('#total').textContent = fmt(sub + (c.length ? z.fee : 0)); $('#eta').textContent = z.min + ' minutes';
  }
  var cb = $('#cart-body');
  if (cb) {
    $('#zone').innerHTML = Object.keys(ZONES).map(function (k) { return '<option value="' + k + '">' + ZONES[k].n + '</option>'; }).join('');
    $('#zone').addEventListener('change', renderCart);
    cb.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var c = cart(), i = +b.dataset.i;
      if (b.dataset.act === 'inc') c[i].q++;
      if (b.dataset.act === 'dec') c[i].q--;
      if (b.dataset.act === 'del' || c[i].q < 1) c.splice(i, 1);
      set(K, c); badge(); renderCart();
    });
    var mm = $('#mm'), gw = $('#gw');
    document.querySelectorAll('input[name=pay]').forEach(function (r) {
      r.addEventListener('change', function () {
        var v = $('input[name=pay]:checked').value, isMM = v === 'mtn' || v === 'airtel';
        mm.hidden = !isMM; $('#mmphone').required = isMM;
        gw.hidden = !(v === 'card' || v === 'paypal');
        gw.textContent = v === 'paypal' ? 'Demo only: a real PayPal login window would open here.' : 'Demo only: a real secure card page from your payment provider would open here. Never type real card numbers into this practice site.';
      });
    });
    $('#checkout').addEventListener('submit', function (e) {
      e.preventDefault();
      var c = cart(); if (!c.length) return;
      var z = ZONES[$('#zone').value], sub = c.reduce(function (a, i) { return a + i.price * i.q; }, 0), p = $('input[name=pay]:checked').value;
      set(O, { id: 'TH' + Math.floor(1000 + Math.random() * 9000), items: c, sub: sub, fee: z.fee, total: sub + z.fee,
        zone: z.n, min: z.min, pay: PAY[p], payKey: p, name: $('#cname').value, phone: $('#cphone').value,
        where: $('#where').value, placed: Date.now() });
      set(K, []); location.href = 'order.html';
    });
    renderCart();
  }

  /* 3. Order tracking page */
  var tr = $('#track');
  if (tr) {
    var o = get(O, null);
    if (!o) { $('#none').hidden = false; tr.hidden = true; }
    else {
      $('#oid').textContent = o.id;
      $('#osum').innerHTML = o.items.map(function (i) { return '<tr><td>' + esc(i.name) + ' x ' + i.q + '</td><td>' + fmt(i.price * i.q) + '</td></tr>'; }).join('') +
        '<tr><td>Delivery to ' + esc(o.zone) + '</td><td>' + fmt(o.fee) + '</td></tr><tr><th>Total</th><th>' + fmt(o.total) + '</th></tr>';
      $('#opay').textContent = o.payKey === 'cash' ? 'Pay ' + fmt(o.total) + ' in cash when the rider arrives.' : 'Payment method: ' + o.pay + ' (demo, no real money moved).';
      $('#owhere').textContent = o.where + ', ' + o.zone;
      var arrive = new Date(o.placed + o.min * 60000);
      $('#oclock').textContent = arrive.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      var steps = ['s0', 's1', 's2', 's3'].map(function (id) { return document.getElementById(id); });
      var tick = function () {
        var speed = $('#demo').checked ? 60 : 1;
        var el = (Date.now() - o.placed) / 60000 * speed, pct = Math.min(el / o.min, 1);
        var st = pct >= 1 ? 3 : pct >= 0.4 ? 2 : 1;
        steps.forEach(function (s, i) { s.className = i < st ? 'done' : i === st ? 'active' : ''; if (st === 3) s.className = 'done'; });
        $('#bar').style.width = Math.round(pct * 100) + '%';
        var left = Math.max(0, Math.ceil(o.min - el));
        $('#left').textContent = pct >= 1 ? 'Delivered. Enjoy your meal!' : 'Arriving in about ' + left + ' minute' + (left === 1 ? '' : 's');
      };
      $('#demo').addEventListener('change', function () { o.placed = Date.now(); tick(); });
      tick(); setInterval(tick, 1000);
    }
  }
  badge();
})();
