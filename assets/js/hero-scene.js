/* Hero « les trois fioles » : la scene WebGL.
   Trois calques dans un seul dessin : le mur et la tablette, les fioles
   Korei, et derriere, la photo des flacons d'origine. Une lentille de verre
   suit la souris et laisse voir les vrais parfums ; les calques glissent
   legerement en parallaxe.
   Sobriete technique : un seul appel de dessin, pas de bibliotheque, densite
   de pixels plafonnee, boucle arretee quand rien ne bouge ou que le hero
   sort de l'ecran. Sans WebGL ou si l'utilisateur refuse les animations,
   le DOM reste tel quel (image fixe + fioles en CSS). */
(function () {
  "use strict";

  var hero = document.querySelector(".hero--fioles");
  if (!hero) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var fiolesImg = hero.querySelector(".hero__fioles img");
  var content = hero.querySelector(".hero__content");
  var legende = hero.querySelector(".hero__legende");
  var indice = hero.querySelector(".hero__indice");
  if (!fiolesImg) return;

  var canvas = document.createElement("canvas");
  canvas.className = "hero__scene";
  canvas.setAttribute("aria-hidden", "true");
  var gl =
    canvas.getContext("webgl", { alpha: false, antialias: false, premultipliedAlpha: true }) ||
    canvas.getContext("experimental-webgl");
  if (!gl) return;

  var petit = window.matchMedia("(max-width: 640px)").matches;
  var souris = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var base = hero.dataset.assets || "assets/images/";
  var SRC = {
    fond: base + "hero/hero-fond" + (petit ? "-sm" : "") + ".webp",
    fioles: base + "formats/fioles-korei-2-5-10ml" + (petit ? "-sm" : "") + ".webp",
    flacons: base + "hero/hero-flacons-niche" + (petit ? "-sm" : "") + ".webp",
  };

  var VERT = [
    "attribute vec2 a;",
    "void main(){gl_Position=vec4(a,0.,1.);}",
  ].join("\n");

  var FRAG = [
    "precision mediump float;",
    "uniform vec2 u_res;",
    "uniform sampler2D u_fond,u_fioles,u_flacons;",
    "uniform float u_fondA,u_flaconsA;",
    "uniform vec4 u_rect;",
    "uniform vec2 u_mouse,u_par;",
    "uniform float u_open,u_intro,u_dpr,u_flZoom,u_flY;",
    // Recadrage « cover » d'une image dans le canvas, avec un point d'ancrage
    // et une marge de zoom pour la parallaxe.
    "vec2 cover(vec2 uv,float imgA,vec2 anchor,float zoom,vec2 shift){",
    "  float ca=u_res.x/u_res.y;",
    "  vec2 f=(ca>imgA)?vec2(1.,imgA/ca):vec2(ca/imgA,1.);",
    "  f/=zoom;",
    "  return anchor*(1.-f)+uv*f+shift;",
    "}",
    "float fiolesA(vec2 l){",
    "  if(l.x<0.||l.x>1.||l.y<0.||l.y>1.)return 0.;",
    "  return texture2D(u_fioles,l).a;",
    "}",
    "void main(){",
    "  vec2 p=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y);",
    "  vec2 uv=p/u_res;",
    "  vec2 dm=p-u_mouse;",
    "  float R=0.34*min(u_res.x,u_res.y)*max(u_open,0.001);",
    "  float d=length(dm)/R;",
    "  vec2 dir=dm/max(length(dm),1.);",
    // Bord de verre : l'image est tiree vers l'exterieur pres du bord.
    "  float edge=smoothstep(0.55,1.0,d)*(1.-smoothstep(1.0,1.14,d));",
    "  float outer=smoothstep(0.9,1.0,d)*(1.-smoothstep(1.0,1.25,d));",
    // 1. Le mur, avec une legere refraction juste hors de la lentille.
    "  vec2 fuv=cover(uv,u_fondA,vec2(0.5,1.0),1.06,u_par*vec2(0.012,0.006));",
    "  fuv-=dir*outer*0.012*u_open;",
    "  vec3 col=texture2D(u_fond,fuv).rgb;",
    // 2. Les fioles : ombre portee (lumiere venant de droite) puis les fioles.
    "  vec2 shift=vec2(u_par.x*14.,u_par.y*8.)*u_dpr+vec2(0.,(1.-u_intro)*26.*u_dpr);",
    "  vec2 l=(p-u_rect.xy-shift)/u_rect.zw;",
    "  vec2 so=vec2(-16.,20.)*u_dpr/u_rect.zw;",
    "  vec2 sp=vec2(6.,6.)*u_dpr/u_rect.zw;",
    "  float sh=fiolesA(l-so)*0.36+fiolesA(l-so+sp)*0.16+fiolesA(l-so-sp)*0.16+fiolesA(l-so+vec2(sp.x,-sp.y))*0.16+fiolesA(l-so-vec2(sp.x,-sp.y))*0.16;",
    "  col=mix(col,col*vec3(0.62,0.58,0.52),sh*0.5*u_intro);",
    // Ombre de contact, plate, sous les pieds.
    "  vec2 c=vec2(u_rect.x+u_rect.z*0.5+shift.x,u_rect.y+u_rect.w+shift.y);",
    "  vec2 e=(p-c)/vec2(u_rect.z*0.62,u_rect.w*0.045);",
    "  float contact=(1.-smoothstep(0.2,1.0,length(e)))*0.28*u_intro;",
    "  col=mix(col,col*vec3(0.6,0.56,0.5),contact);",
    "  vec4 v=vec4(0.);",
    "  if(l.x>=0.&&l.x<=1.&&l.y>=0.&&l.y<=1.)v=texture2D(u_fioles,l)*u_intro;",
    "  col=col*(1.-v.a)+v.rgb;",
    // 3. Dans la lentille : les flacons d'origine, refractes au bord.
    "  vec2 buv=cover(uv,u_flaconsA,vec2(0.5,u_flY),u_flZoom,u_par*vec2(-0.018,-0.010));",
    "  buv+=dir*edge*0.045;",
    "  vec3 bott=texture2D(u_flacons,buv).rgb;",
    "  bott*=1.-0.14*smoothstep(0.55,1.0,d);",
    "  float mask=(1.-smoothstep(0.93,1.0,d))*step(0.02,u_open);",
    "  col=mix(col,bott,mask);",
    // Liseré dore et reflet, tres discrets.
    "  float ring=exp(-pow((d-1.0)*16.,2.));",
    "  float spec=ring*max(0.,dot(dir,normalize(vec2(-0.55,-0.83))));",
    "  col+=vec3(0.80,0.64,0.30)*ring*0.09*u_open+vec3(1.)*spec*0.10*u_open;",
    "  gl_FragColor=vec4(col,1.);",
    "}",
  ].join("\n");

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      return null;
    }
    return s;
  }
  var vs = shader(gl.VERTEX_SHADER, VERT);
  var fs = shader(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var aLoc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(aLoc);
  gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ["u_res", "u_fond", "u_fioles", "u_flacons", "u_fondA", "u_flaconsA", "u_rect", "u_mouse", "u_par", "u_open", "u_intro", "u_dpr", "u_flZoom", "u_flY"].forEach(function (n) {
    U[n] = gl.getUniformLocation(prog, n);
  });

  function texture(unit, img) {
    var t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    return t;
  }

  function charger(src) {
    return new Promise(function (ok, ko) {
      var im = new Image();
      im.decoding = "async";
      im.onload = function () { ok(im); };
      im.onerror = ko;
      im.src = src;
    });
  }

  // ── Etat de la scene ────────────────────────────────────────────────────
  var dpr = 1;
  var W = 0, H = 0;
  var rect = [0, 0, 1, 1];
  var mouse = { x: 0, y: 0 };      // position lissee, en px canvas
  var cible = { x: 0, y: 0 };      // position visee
  var par = { x: 0, y: 0 };        // parallaxe lissee, -1..1
  var parCible = { x: 0, y: 0 };
  var open = 0, openCible = 0;
  var intro = 0, introDepart = 0;
  var t0 = performance.now();
  var actif = false;               // boucle en cours
  var visible = true;
  var dansHero = false;
  var derive = !souris;            // sans souris, la lentille se promene seule
  var toucher = false;
  var pret = false;

  function mesurer() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var hb = hero.getBoundingClientRect();
    W = Math.round(hb.width * dpr);
    H = Math.round(hb.height * dpr);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    var fb = fiolesImg.getBoundingClientRect();
    rect = [(fb.left - hb.left) * dpr, (fb.top - hb.top) * dpr, fb.width * dpr, fb.height * dpr];
    gl.viewport(0, 0, W, H);
    gl.uniform2f(U.u_res, W, H);
    gl.uniform4f(U.u_rect, rect[0], rect[1], rect[2], rect[3]);
    gl.uniform1f(U.u_dpr, dpr);
    // En portrait, la photo des flacons serait enorme en « cover » : on la
    // recule (zoom < 1) et on la centre sur la zone des fioles.
    var portrait = W < H;
    gl.uniform1f(U.u_flZoom, portrait ? 0.62 : 1.1);
    gl.uniform1f(U.u_flY, portrait ? (rect[1] + rect[3] * 0.5) / H : 0.5);
    if (!mouse.x && !mouse.y) {
      mouse.x = cible.x = W * 0.5;
      mouse.y = cible.y = rect[1] + rect[3] * 0.5;
    }
    demander();
  }

  var dernier = 0;
  function rendre(now) {
    // Sans souris (telephone), la lentille se promene seule : 30 images par
    // seconde suffisent et menagent la batterie.
    if (derive && !toucher && now - dernier < 30) {
      requestAnimationFrame(rendre);
      return;
    }
    dernier = now;
    var k = 0.085;
    mouse.x += (cible.x - mouse.x) * k;
    mouse.y += (cible.y - mouse.y) * k;
    par.x += (parCible.x - par.x) * 0.06;
    par.y += (parCible.y - par.y) * 0.06;
    open += (openCible - open) * 0.07;
    if (intro < 1) {
      var e = Math.min(1, (now - introDepart) / 1100);
      intro = 1 - Math.pow(1 - e, 3);
    }
    if (derive && !toucher) {
      var t = (now - t0) * 0.001;
      cible.x = W * (0.5 + 0.30 * Math.sin(t * 0.33));
      cible.y = rect[1] + rect[3] * (0.45 + 0.22 * Math.sin(t * 0.21 + 1.3));
      parCible.x = 0.5 * Math.sin(t * 0.27);
      parCible.y = 0.25 * Math.cos(t * 0.19);
    }
    gl.uniform2f(U.u_mouse, mouse.x, mouse.y);
    gl.uniform2f(U.u_par, par.x, par.y);
    gl.uniform1f(U.u_open, open);
    gl.uniform1f(U.u_intro, intro);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Le texte et la legende glissent a l'inverse des calques, tres peu.
    var tx = (-par.x * 7).toFixed(2), ty = (-par.y * 4).toFixed(2);
    content.style.transform = "translate3d(" + tx + "px," + ty + "px,0)";
    if (legende) legende.style.transform = "translate3d(" + (-par.x * 3).toFixed(2) + "px,0,0)";

    var calme =
      Math.abs(cible.x - mouse.x) < 0.3 &&
      Math.abs(cible.y - mouse.y) < 0.3 &&
      Math.abs(openCible - open) < 0.002 &&
      Math.abs(parCible.x - par.x) < 0.002 &&
      Math.abs(parCible.y - par.y) < 0.002 &&
      intro >= 1;
    if (visible && (derive || !calme)) {
      requestAnimationFrame(rendre);
    } else {
      actif = false;
    }
  }

  function demander() {
    if (!pret || actif || !visible) return;
    actif = true;
    requestAnimationFrame(rendre);
  }

  function viser(clientX, clientY) {
    var hb = hero.getBoundingClientRect();
    cible.x = (clientX - hb.left) * dpr;
    cible.y = (clientY - hb.top) * dpr;
    parCible.x = ((clientX - hb.left) / hb.width) * 2 - 1;
    parCible.y = ((clientY - hb.top) / hb.height) * 2 - 1;
  }

  if (souris) {
    hero.addEventListener("pointermove", function (ev) {
      if (ev.pointerType && ev.pointerType !== "mouse") return;
      dansHero = true;
      openCible = 1;
      viser(ev.clientX, ev.clientY);
      if (indice) indice.classList.add("is-vu");
      demander();
    }, { passive: true });
    hero.addEventListener("pointerleave", function () {
      dansHero = false;
      openCible = 0;
      parCible.x = 0;
      parCible.y = 0;
      demander();
    });
  } else {
    openCible = 1;
    hero.addEventListener("touchstart", function (ev) {
      toucher = true;
      var t = ev.touches[0];
      viser(t.clientX, t.clientY);
      demander();
    }, { passive: true });
    hero.addEventListener("touchmove", function (ev) {
      var t = ev.touches[0];
      viser(t.clientX, t.clientY);
    }, { passive: true });
    hero.addEventListener("touchend", function () { toucher = false; }, { passive: true });
  }

  // Pause quand le hero n'est plus a l'ecran ou que l'onglet est cache.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting && !document.hidden;
      demander();
    }, { threshold: 0.05 }).observe(hero);
  }
  document.addEventListener("visibilitychange", function () {
    visible = !document.hidden;
    demander();
  });

  var rafResize = 0;
  window.addEventListener("resize", function () {
    cancelAnimationFrame(rafResize);
    rafResize = requestAnimationFrame(mesurer);
  });

  Promise.all([charger(SRC.fond), charger(SRC.fioles), charger(SRC.flacons)]).then(function (ims) {
    texture(0, ims[0]);
    texture(1, ims[1]);
    texture(2, ims[2]);
    gl.uniform1i(U.u_fond, 0);
    gl.uniform1i(U.u_fioles, 1);
    gl.uniform1i(U.u_flacons, 2);
    gl.uniform1f(U.u_fondA, ims[0].naturalWidth / ims[0].naturalHeight);
    gl.uniform1f(U.u_flaconsA, ims[2].naturalWidth / ims[2].naturalHeight);

    hero.insertBefore(canvas, hero.firstChild);
    pret = true;
    mesurer();
    // Si la page est la depuis un moment, les fioles CSS sont deja posees :
    // pas de seconde entree, la scene prend le relais sans a-coup.
    var depuis = performance.now() - t0;
    if (depuis > 1400) {
      intro = 1;
    } else {
      introDepart = performance.now() + Math.max(0, 450 - depuis);
    }
    gl.uniform1f(U.u_intro, intro);
    gl.uniform2f(U.u_mouse, mouse.x, mouse.y);
    gl.uniform2f(U.u_par, 0, 0);
    gl.uniform1f(U.u_open, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    hero.classList.add("is-scene");
    demander();
  }).catch(function () { /* on garde l'image fixe */ });
})();
