// 点击图片放大查看（全站共用）：支持双指捏合缩放 / 双击放大 / 拖动查看
(function () {
  var MIN = 1, MAX = 5;
  var scale = 1, tx = 0, ty = 0;          // 当前变换
  var img, stage, lb;

  function ensureBox() {
    if (lb) return lb;
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.className = 'lightbox';
    lb.innerHTML =
      '<div class="lb-stage"><img alt=""></div>' +
      '<span class="lb-close">×</span>' +
      '<div class="lb-tip">双指捏合 / 双击放大 · 拖动查看</div>' +
      '<div class="lb-cap"></div>';
    document.body.appendChild(lb);
    stage = lb.querySelector('.lb-stage');
    img = lb.querySelector('img');
    lb.querySelector('.lb-close').addEventListener('click', close);
    bindGestures();
    return lb;
  }

  function apply() {
    img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    lb.classList.toggle('zoomed', scale > 1.01);
  }
  function reset() { scale = 1; tx = 0; ty = 0; apply(); }

  function bindGestures() {
    var startDist = 0, startScale = 1, startTx = 0, startTy = 0;
    var startX = 0, startY = 0, panning = false, lastTap = 0, moved = false;

    stage.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        startDist = dist(e.touches);
        startScale = scale;
      } else if (e.touches.length === 1) {
        startX = e.touches[0].clientX; startY = e.touches[0].clientY;
        startTx = tx; startTy = ty; panning = scale > 1.01; moved = false;
      }
    }, { passive: false });

    stage.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && startDist) {
        e.preventDefault();
        var c = center(e);
        zoomTo(startScale * dist(e.touches) / startDist, c.x, c.y);
        moved = true;
      } else if (e.touches.length === 1 && panning) {
        e.preventDefault();
        tx = startTx + (e.touches[0].clientX - startX);
        ty = startTy + (e.touches[0].clientY - startY);
        clamp(); apply(); moved = true;
      }
    }, { passive: false });

    stage.addEventListener('touchend', function (e) {
      startDist = 0;
      if (e.touches.length === 0) {
        var now = Date.now();
        if (!moved && now - lastTap < 300) {          // 双击：放大/还原
          e.preventDefault();
          var c = center(e.changedTouches ? { touches: e.changedTouches } : e);
          if (scale > 1.01) reset(); else zoomTo(2.6, c.x, c.y);
          lastTap = 0;
        } else if (!moved) {
          lastTap = now;
          if (scale <= 1.01) setTimeout(function () { if (Date.now() - lastTap >= 290) close(); }, 300);
        }
      }
    }, { passive: false });

    // 桌面端：滚轮缩放 + 双击
    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      var c = center(e);
      zoomTo(scale * (e.deltaY < 0 ? 1.15 : 0.87), c.x, c.y);
    }, { passive: false });
    stage.addEventListener('dblclick', function (e) {
      e.preventDefault();
      var c = center(e);
      if (scale > 1.01) reset(); else zoomTo(2.6, c.x, c.y);
    });
  }

  function open(src, cap) {
    ensureBox();
    img.src = src;
    lb.querySelector('.lb-cap').textContent = cap || '';
    reset();
    lb.classList.add('on');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    if (lb) { lb.classList.remove('on'); document.body.style.overflow = ''; }
  }

  function clamp() {
    // 限制平移，避免把图拖出可视区太远
    var r = stage.getBoundingClientRect();
    var maxX = (img.clientWidth * scale - r.width) / 2;
    var maxY = (img.clientHeight * scale - r.height) / 2;
    maxX = Math.max(0, maxX); maxY = Math.max(0, maxY);
    tx = Math.min(maxX, Math.max(-maxX, tx));
    ty = Math.min(maxY, Math.max(-maxY, ty));
  }

  function center(e) {
    var r = stage.getBoundingClientRect();
    var t = e.touches;
    if (t && t.length === 2) {
      return { x: (t[0].clientX + t[1].clientX) / 2 - r.left - r.width / 2,
               y: (t[0].clientY + t[1].clientY) / 2 - r.top - r.height / 2 };
    }
    var p = (t && t[0]) || e;
    return { x: p.clientX - r.left - r.width / 2, y: p.clientY - r.top - r.height / 2 };
  }
  function dist(t) {
    var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
    return Math.hypot(dx, dy);
  }

  function zoomTo(ns, fx, fy) {
    ns = Math.min(MAX, Math.max(MIN, ns));
    // 以焦点 (fx,fy) 为锚点缩放，保持焦点位置不动
    tx = fx - (fx - tx) * (ns / scale);
    ty = fy - (fy - ty) * (ns / scale);
    scale = ns;
    if (scale <= 1.01) { tx = 0; ty = 0; }
    clamp(); apply();
  }


  document.addEventListener('click', function (e) {
    var t = e.target.closest('.zoomable, .figbox');
    if (!t) return;
    var im = t.tagName === 'IMG' ? t : t.querySelector('img');
    if (!im) return;
    var full = t.getAttribute('data-full') || im.getAttribute('data-full');
    open(full || im.getAttribute('src'), im.getAttribute('data-cap') || im.getAttribute('alt') || '');
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
