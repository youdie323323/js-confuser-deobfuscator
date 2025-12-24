(xx, Jx, iJ) => {
  "use strict";

  iJ.d(Jx, {
    c: () => ox,
    f: () => rx,
    h: () => Vx
  });
  var ux = iJ(121);
  var jJ = iJ(112);
  var vx = iJ(124);
  var Xx = iJ.n(vx);
  var Fx = iJ(387);
  var Px = iJ(15631);
  var Ux = iJ(548);
  var hx = iJ(76);
  var ex = iJ(48);
  const ax = Xx().create();
  const Yx = Xx().create();
  const Vx = {
    [ux.X.PLAYER]: {},
    [ux.X.BOAT]: {
      canAutoStep: xx => xx.isOnIce,
      getVehicleMoveSpeedMult: (xx, Jx, iJ, ux) => {
        const jJ = xx;
        if (ux || Jx.lastBlockStandingOnWasIce) {
          return jJ.speedMult;
        } else if (!Jx.isOnGround() && Jx.inAirFromWater) {
          return jJ.inAirSpeedMult;
        } else {
          return jJ.onLandSpeedMult;
        }
      }
    },
    [ux.X.GLIDER]: {
      performMovementTick(xx, Jx, iJ, vx, Fx, Ux, hx, ex) {
        if (iJ.isInAir && !ex && (Fx.cU[1] < 0 || iJ.movementTypeLastTick === ux.O.GLIDING) && !iJ.hitWhilstGliding) {
          iJ.movementType = ux.O.GLIDING;
          if (iJ.movementTypeLastTick !== ux.O.GLIDING) {
            xx.bloxd.updatePositionAndPhysics(Jx, iJ.vehicle, false, undefined, true);
            Zx(xx, Jx, iJ);
          }
        } else {
          iJ.movementType = ux.O.NORMAL;
          if (iJ.movementTypeLastTick !== ux.O.NORMAL) {
            xx.bloxd.updatePositionAndPhysics(Jx, {
              type: ux.X.PLAYER,
              tier: null
            }, false, undefined, true);
            Zx(xx, Jx, iJ);
          }
        }
        if (iJ.movementType === ux.O.GLIDING && iJ.movementTypeLastTick !== ux.O.GLIDING) {
          const ux = Xx().len(Fx.cU);
          iJ.dj = ux;
          iJ.gj = [Fx.cU[0], Fx.cU[1], Fx.cU[2]];
          if (ox(xx.PP.dP(Jx).inventory) !== null) {
            rx(xx, Jx, iJ);
          }
        }
        if (iJ.isOnGround()) {
          iJ.hitWhilstGliding = false;
        }
        if (iJ.movementType === ux.O.GLIDING) {
          let ux = 1;
          if (iJ.dj > 0) {
            if (vx.cameraPitch < 0) {
              ux = 3;
            }
            iJ.dj -= 0.5;
          }
          let Px = Xx().len(iJ.gj) + vx.cameraPitch * hx.maxSpeed * hx.accel * ux;
          Px = jJ.e.clamp(Px, 0.5, hx.maxSpeed);
          iJ.gliderImpulseTicksAgo++;
          lx(xx, Jx, iJ, vx, Fx, Px);
        } else if (vx.speed) {
          (0, Px.f)(xx, Jx, iJ, vx, Fx, Ux, hx);
        } else {
          Fx.friction = hx.standingFriction;
        }
      },
      applyImpulse: (xx, Jx, iJ, jJ, vx, Fx) => {
        if (iJ.movementType === ux.O.GLIDING) {
          iJ.dj = Xx().len(Fx);
          iJ.gliderImpulseTicksAgo = 0;
          vx.applyImpulse(Fx);
          xx.PP.MU(Jx).EU();
        }
      },
      onPositionCorrection: (xx, Jx, iJ, jJ) => {
        if (!jJ || iJ.movementType !== ux.O.GLIDING) {
          return;
        }
        const {
          dj: vx,
          gj: Xx
        } = jJ;
        iJ.dj = vx;
        iJ.gj = Xx;
      }
    },
    [ux.X.BALLOON]: {
      performMovementTick(xx, Jx, iJ, jJ, vx, Xx, Ux, hx) {
        const ex = Ux.effect.duration / 1000 * Fx.k.clientTicksPerSecond;
        if (iJ.isInAir && !hx && (vx.cU[1] < 0 || iJ.movementTypeLastTick === ux.O.FLOATING) && !iJ.hitWhilstFloating && (!iJ.floatStartTicksAgo || iJ.floatStartTicksAgo < ex)) {
          iJ.movementType = ux.O.FLOATING;
          if (iJ.movementTypeLastTick !== ux.O.FLOATING) {
            xx.bloxd.updatePositionAndPhysics(Jx, iJ.vehicle, false, undefined, true);
          }
        } else {
          iJ.movementType = ux.O.NORMAL;
          if (iJ.movementTypeLastTick !== ux.O.NORMAL) {
            xx.bloxd.removeBalloonPhysics(Jx, iJ.hasTakenOffTheGround);
          }
        }
        if (iJ.isOnGround()) {
          iJ.hitWhilstFloating = false;
          iJ.hasTakenOffTheGround = false;
          iJ.floatStartTicksAgo = null;
        } else if (vx.cU[1] < 0 && !iJ.hasTakenOffTheGround) {
          iJ.floatStartTicksAgo = 0;
          iJ.hasTakenOffTheGround = true;
        }
        iJ.floatStartTicksAgo++;
        if (iJ.movementType === ux.O.FLOATING) {
          (function (xx, Jx, iJ, ux, jJ, vx, Xx) {
            (0, Px.f)(xx, Jx, iJ, ux, jJ, vx, Xx);
            jJ.cU[1] = Math.max(jJ.cU[1], -2);
          })(xx, Jx, iJ, jJ, vx, Xx, Ux);
        } else if (jJ.speed) {
          (0, Px.f)(xx, Jx, iJ, jJ, vx, Xx, Ux);
        } else {
          vx.friction = Ux.standingFriction;
        }
      }
    },
    [ux.X.SLEEPING]: {
      getTargetRenderHeadingDir: (xx, Jx, iJ, jJ) => {
        switch (jJ.vehicle.tier) {
          case ux.Y.ROTATION_1:
            return 0;
          case ux.Y.ROTATION_2:
            return Math.PI / 2;
          case ux.Y.ROTATION_3:
            return Math.PI;
          case ux.Y.ROTATION_4:
            return -Math.PI / 2;
          default:
            return Jx.renderHeading;
        }
      },
      updateServerHeading: (xx, Jx, iJ) => {
        switch (iJ.PP.tP(xx).vehicle.tier) {
          case ux.Y.ROTATION_1:
            return 0;
          case ux.Y.ROTATION_2:
            return Math.PI / 2;
          case ux.Y.ROTATION_3:
            return Math.PI;
          case ux.Y.ROTATION_4:
            return -Math.PI / 2;
          default:
            return Jx.heading;
        }
      },
      inputUpdateHeadingAndDir: (xx, Jx, iJ, ux, jJ) => {},
      isMoving: (xx, Jx, iJ) => false,
      performMovementTick(xx, Jx, iJ, ux, jJ, vx, Xx, Fx) {}
    },
    [ux.X.RIDING_MOB]: {}
  };
  let lx;
  var Rx;
  var yx = ["N<G_k]>jPM.GTFr(d&ZgDA(y", "W0PiC*g<GsH", "Y>y+ZE7DWB*11Gq~*&cMt[O~1/mMIFa~WNSnN2C", "{nuiW|3W2snVs*s%?V+i(ht<Gs;={,o(or90>hy@NXpEB`ibe+.5", ":d9gn+$!T}Y_[rk47+>#!wG/U|Wi&V", "G=\"^T98Pzo;h!ro4zEO#ev?s%%$_AfSiUa:#V>u~tB!oy", "krX^fB`F", "ZUq#M|QP,O", "(&p1)@z,aQAz^=h%!C", "1dIWih)_Bb;g$F", "odb+RDx4&B=d^V_~]iaWdHZB>Op8q6`n:4?i=^AsgsiMwk\"`1&yANEC", "XX&0le>`Qrsl4#onU&]JR&75D%9<y", "CttuC2[<&B*Tr=]>:0s_fX/W})1g3a^S430J%]t<:THD>~c:7U0*y,Qj43", "m+.iShl(|XpiTHiU:p~+0+i%M|J}{E+4caxO4I^>Ag\"/B`S/(J_z9XqWu", "hU[0PMJs(3t<;f`(>Nv#|>s%u", "MBhg/!i5us(}!rg0eVL5~BC", "7N5O9.hy0}#Mh,34BZ;wr>2_SsGkC#{>7pU5Fw2<5", "$SWqm4C", "7cIO#9r`A}O&\"|`DfP/A=M_`FN8=T0sS\"+4hb", "5NaWcI`<YOhmxI\"UX&n5F]nW=@g&P]wD=+(JylC", "bawqLAJdF+5J1GKcWdC7%e\"Wt=8<h,#Dfz`7[LdI_b^_t|!U}>C7n", "<aOj6S{by=8<;YN%|Uc5PM`j&sTMx=LS=47#Prx<X@^/mUR%_3Yg0", "cc!0j?Twusx1/fCbv+.no4ccr}j5I\"xnb@Hw`92>QroiTF", "9L|gxH3,q3v}MY+nTa&0}wC2|fL!xazd5NVuiI44RZAz50*itUF", "w>OJcawI?Qx\"dFCd$XyPr\"ZcEB]u/](~ed;1W)C", "!Jtc!E}svN4^f02ng@F", "o3#*UhkF9Q)Wz#@,+a7*N", "^XEJV_hco%*rMeVpYn[uF*#w.@c!)=dc]nV1Y]C", "Zdj5H&acO3ss<6T0t+F", "eaE+vU@cXw4`zV", "afPM+\"Ej}T+^jf/nHNq#LJVs3B[\"8`Cj+JF", "Pry#~4q\"c}{<orccwEih+SjjcXZh%}ZbZXyjUUSICNi*#F7/;XfiVwMy", "8U4O8]~IVQdlyEB(;id^|<S5X}@h[`e`n>bA@|K2C/N>Y~HnkB3_v)?!P", "oB?Gp+4WCr4nY~hi{gC+gX$y", "#&90_r3_o%5&!vDjnaF1n", ",p(#Y,m8rXc*b]A074V", "Ip9g?LC,h3{mG9ccMf`7I@s!?sH`W9E4", "m3xhw1j/rwRMh*mnYimMg>5syNo>LGFp7&L_gMC", "Q4MOp\"9cP|&~y", "NB4Ogl#(i/(^%f(SxX/zC2!y.wc*zV}cT/y+p\"C", "G/6i:D6dzt}5r#wD6hJcXEvA^))zRII#?iYz=9C", "EBvg`I</}g5VZGf3ZVs5", "s</A_EwI6fl<Kvm4|XeO??bwY=11ou946Oin)lUAUs|1C,X`/0!Mb", "5z&0_!ZcG%._M9ainO(+.]Qj>N{_)rdDQnV", "\"Z!WsB!5T3BDvGR%GO$v3Hsw6}X<y", "1>qA2H(DGQ;T!ES%^&CJ,4P|G", "%a&Mj4LDqfar,#24qNuq!wFj)ZTkwrpes=SO%!YWaQ._C", "|+Qh76k\"1Tlrck{k{h_J34)W:3_8wGR%j=+^@[(5n}LXE=>/T@:Auw(@<g", "}aIWh!%%{bRq~G|,ZJ<On}|8CNj5n}t,[}^cz.BApZ(", "{}!nx^iIp)y#I|Xb,EJ_}ST5?|)z:6Ae?i4O27H<ATjWxD6dpi6_0hJ5/O", "<Z2^cI:|F@;\"[`;i&&ZP`a$b6w&nhGz/", "}3FzE)!J6wgZ`V/3SX\"nY]15Dr7E:~heTd<Mph7A@wUnMYg", "Mb$W?B9BzoM8Q`x(#&~J&w9(6Tz!C=Bc`zXnAHrF", "~<L5[HS%MsVO4IDbl\"V", "irSOP]hcm|V+mU(~?Z25F2r2rXQ~,#yUZddv0WAyd39H`aP~q0`O+[C", "pP\"5]a&`l/lTF][#|UmWO!F,gq2zT0841}%c}wlykO", "b<N1Y73|6f`bW}c,5<kAnWT(xsa@9\"L#paiGvS3g5q$/m6hiFG:z!w]y", "%Ndv>v*jQ=O*#H%(ZEH#arlsrbt@I\"|:IZD**,s5ms", "SP(PH&^<soSqq]u%PvYzJJDIy/DVGaf", "EixP6r;(U|?=~*cc)aXM;_E8PQ.]jvG`[Z25b", "R>QPl^{Dt@k>Br)DM+I^s", "a+7J`^l(nf6vFu6:?Siv}l?(KZzZ50O", "o3*h5r5A1Ty&&92>%4lO`}z/cXh8nand/4F", "frlG]XIy", "#=~JKhBsf/W}SYLSNBIn{?8<;B2</uM>YnpcRDWFO|Ckjvq", ">+ZPRYx4q}&=vGv#", "vVP^q!.WC@Q~=Ha%1~Cjh,p%fti^J=,`}aVuKhE|Io", "s4h+leC`7+c!,V5eRX_JOB#c$34Wk=Zi*:F", "$S~+8WkWv/", "|L/*r>YWm|V*O,#d6VwM#DcDD+Wi*}{d9~mWzI#%]r/A>|}cJ0=^%", "u+]gXSb%zt9gn}p%VoOj\"l.2:3[)l0ZiozTzH<z8_f", "1)+W}<;BEoWhBkM(Oz,_`}pDCo\"yx}Di}a25@lhyko~3vGq3", "P@~A3H`gsow", "%c{+~eHF", "?i`j~h*<}}]\"yk2#G&9_^_*|</lv2]{(?S|J~?>F", "<OZ+MU:/F=w", "O@~z?^Y4P|*mO,C:JJC.M|95Zro!WEui{LPOLY*27BQhjHXjeE(J~", "DclvpY]Dp3Nlh`K,Zb)vLYc(|X@W{r7bXOAu:h0`X)QhGVD~mdPW\">IDp365y", ")X!5L1$58BqP?`W4KnhPf_y%hb", "CG^c8BjF{Xarm6|c|ZXv[W(]P", "TN5Wl]psT30#l\"q~5N%*!EH<+|4^}|o(3J1Hk,R|5", "0=}g+UgWbt^_SVSU&E&1Qr~w5", "td7AI\"Q`#}yU=F;`n0aOhrh(y=hGxVzj:dKzvUh5CriVy", "\"V[_B[1(ErDlAab33dkjv1*<Z+a8m6:eRXGHe&u]y=.vhE/>ncWcV*Zy", "n+Pi,A)/8/OVN9&iVO(P@>u%ms[\"ZrwDSZ4J0e1s\"|]/?GG/,=91Y]GgPq~", "(&(J2LY4Rblms[M($JcWDID5RZmY=FrjpJA0IJXjP", "0_Snr|*|zri^yrg/%P?0{}22KX!rykV~2EnMxeX<Us2/?8upS&]+KezWV", "qN^0`^Q/A)D^>f?>QPp*#?BISs5O}Y`>E>jM+<f,qb[_.!|c.}gjm._|F+~Ey", "0a5W@_T~Ws}", "eJ!^:U<Q0fxy#YGp3J?_aHngw|8TBG", "ZJ~+keWjEO", ",Jv#Y^AJqMu&IF}bcZd+v\"f`?|NA[89#}U\"Mj", "[3n1Y!.4Yr2y0v{dQX&1V*t_nfq&sU?#,N+Gd?;d%+@<=Yd(:ZzO_]I(6/$ry", "xg7P<8wI@)z^Afzdyr!i3W3_vO#|/UB(8J2hb9ly7/k*C=D,", "5B<GWA|4/Bv!=#x:zNQPR8_jl=R5CV", "O<>#__8_AZEbu*\"eA&\"nO!$5{Z&hjF", ",&@GN_FgZO_TBkSUa37J`aoyC@Ul@9$cA)Pi(IoD2%OsbkxnS0$vD6K4u", "N&3_OXhy", "1yX/f{]6", "Ff:^y&6R+*{gt3cJu,f", "Jme^2dtC", "HW}(", "_tRsw4qShha<2;{V9!\"=a_W,Sh", "Xn_~miIT1OQ4w", "*sc:KVa2]]nfW\"iC%AXhn*q52]", "usU|Hu_=v+9iy_tCl^\"h.I{cy", "0U@vZA4m", "{9n$,S#x", "6NY>,Gk~", "d=Xt05r(__fCSVyPGUxZfdnp(_", "c+&s[ZuA", "h+Q#v_>C", "Oe4=E_.YJh", "_tRsw4R[sX73`vvzhA", "F,e_CR!6", "M/_Zm", "SvD&%+/a", "D%s(Sr#6", "#j#*O", "v2J(>>A6", "V%JH_CBW", "NY}wsRk6", "HVTZ3", ",TvWlG=V", "zP&@=", "+u=)%fj&", "(wLB{C`qVkr$*~C4QV6,_g[:(.#o8rRA<|mI$LQFFw/OhJ4", ":UDa7p72olctr4cg)*P)cqaCwVv_b^5h?&T>nzm7u5C]ZQAX\"p>%Y0.FH\"MuOAHbD%CwMW}V=Ma", "?eKvu(Yr}6G>O|&vf=gAnz/$:J<,^2_XL^lFZ!D`<JMM^25hd72B_c0lE72my", ")y|MVx(5[J{YSYA:y|CAkz*U][U]b4|\"/^lF=c<NAV41|4uh.|*32N\"{_Mz(T", "_^lFHW<5=MyEh46:<<PAN`C$kMO]@4QbB<PA)Yp$ISU]b4T5p^]BEOrUjwdiT", "%zzPnewy", "<;b8kaK*", "3}>u>LH*", "4{&CSRcv", "IIjTL2NF", "@6=HTyjF", "OKqllyn", "Vf[)e$Sim[lUF]m", "==<i}13F", "@0QC&e.R", "BGZ``eD", "sa:nrN+kK:`iR*K", "Y85<=Rb2", "@*0H1f=p", "lb_HE6>=Ne.Yzd~I%OnD$$}&q7u0a]~Iq<iFq%l(w50!G\"%b]b#+D", "fhHBl[iY7r:*\"s;{(#jb$$k+c)|.0?;{*u=CUUyR(l:>og\"<AT", "q$*pyrDk|U;&N(0\"\"$Al]nye?/RXay>]}cwXu", "h&0e", "*)+j8{P2", "YQ&xs>X1", "k@I<q", "6eNLXp|2", "yGU4I", "k<~8Hi*1", "FGb4*"];
  var bx;
  var kJ;
  var qx;
  var mJ;
  var Wx;
  var Mx;
  var cx;
  var Ex;
  var Ox;
  function Tx(_param_66) {
    if (typeof kJ !== "undefined" && kJ) {
      return new kJ().decode(new qx(_param_66));
    } else if (typeof mJ !== "undefined" && mJ) {
      return mJ.from(_param_66).toString("utf-8");
    } else {
      return cx(_param_66);
    }
  }
  function Kx() {}
  function dx(xx, Jx, iJ, ux = {
    ["8XLOXR"]: 2
  }, jJ) {
    function vx(_param_67) {
      if (typeof Rx[_param_67] === "undefined") {
        return Rx[_param_67] = jJ(yx[_param_67]);
      } else {
        return Rx[_param_67];
      }
    }
    jJ ||= function (_param_68) {
      let _var_89 = "&6`|:ePN=fGu1lVC?[smX3@MgbJ<O*a%~.+>I0c!UkK^x;vn,Yo(_\"qH52QpSE{FhjWTyR}wr]/#LZ4B)iz9DA7$d8t";
      let _var_b7 = "" + (_param_68 || "");
      let _var_90 = _var_b7.length;
      let _var_d6 = [];
      let _var_91 = 0;
      let _var_92 = 0;
      let _var_93 = -1;
      let _var_h3 = 0;
      for (; _var_h3 < _var_90; _var_h3++) {
        let _var_i4 = _var_89.indexOf(_var_b7[_var_h3]);
        if (_var_i4 !== -1) {
          if (_var_93 < 0) {
            _var_93 = _var_i4;
          } else {
            _var_93 += _var_i4 * 91;
            _var_91 |= _var_93 << _var_92;
            _var_92 += (_var_93 & 8191) > 88 ? 13 : 14;
            do {
              _var_d6.push(_var_91 & 255);
              _var_91 >>= 8;
              _var_92 -= 8;
            } while (_var_92 > 7);
            _var_93 = -1;
          }
        }
      }
      if (_var_93 > -1) {
        _var_d6.push((_var_91 | _var_93 << _var_92) & 255);
      }
      return Tx(_var_d6);
    };
    var Px = undefined;
    var hx = {
      [vx(98)]: function (_unused, _unused2, _unused3, _param_70, _unused4, _param_72) {
        [[_param_a2, _param_69, _param_c2, _param_70, _param_71, _param_72], _param_g2] = Ox;
        const ux = ax;
        Xx().set(ux, _param_71.cU[0], _param_71.cU[1], _param_71.cU[2]);
        const jJ = Xx().create();
        Xx().kJ(jJ, _param_70.cameraDirection);
        Xx().normalize(jJ, jJ);
        Xx().scale(jJ, jJ, _param_72);
        let _var_94 = 1;
        if (_param_c2.gliderImpulseTicksAgo < 100) {
          _var_94 = Ux.c.lerpWeight(_param_c2.gliderImpulseTicksAgo / Fx.k.clientTicksPerSecond);
          if (_var_94 > 0.8) {
            _var_94 = 1;
            _param_c2.gliderImpulseTicksAgo = 100000;
          }
        }
        Xx().pX(ux, ux, jJ, _var_94);
        Xx().set(_param_c2.gj, ux[0], ux[1], ux[2]);
        Xx().set(_param_71.cU, ux[0], ux[1], ux[2]);
        const vx = Yx;
        Xx().normalize(vx, ux);
        Xx().scale(vx, vx, 1.5);
        if (_param_c2.gliderImpulseTicksAgo > 100) {
          vx[1] = -1.5;
        }
        _param_71.applyImpulse(vx);
        _param_71.friction = _param_c2.gliderFriction;
      }
    };
    if (Jx === vx(114) + vx(115)) {
      Ox = [];
    }
    if (Jx === vx(117) + vx(118)) {
      function bx() {
        let _var_108 = function (_param_91, _param_92, _param_90) {
          let _var_109 = {};
          if (_param_90.length !== _param_91.length + _param_92.length) {
            return false;
          } else {
            return _var_b8(_param_91, _param_92, _param_90, 0, 0, 0, _var_109);
          }
        };
        let _var_b8 = function (_param_98, _param_99, _param_94, _param_96, _param_97, _param_93, _param_95) {
          let _var_110 = false;
          if (_param_93 >= _param_94.length) {
            return true;
          } else if (_param_95["" + _param_96 + _param_97 + _param_93] !== undefined) {
            return _param_95["" + _param_96 + _param_97 + _param_93];
          } else {
            if (_param_94[_param_93] === _param_98[_param_96] && _param_94[_param_93] === _param_99[_param_97]) {
              _var_110 = _var_b8(_param_98, _param_99, _param_94, _param_96 + 1, _param_97, _param_93 + 1, _param_95) || _var_b8(_param_98, _param_99, _param_94, _param_96, _param_97 + 1, _param_93 + 1, _param_95);
            } else if (_param_94[_param_93] === _param_98[_param_96]) {
              _var_110 = _var_b8(_param_98, _param_99, _param_94, _param_96 + 1, _param_97, _param_93 + 1, _param_95);
            } else if (_param_94[_param_93] === _param_99[_param_97]) {
              _var_110 = _var_b8(_param_98, _param_99, _param_94, _param_96, _param_97 + 1, _param_93 + 1, _param_95);
            }
            _param_95["" + _param_96 + _param_97 + _param_93] = _var_110;
            return _var_110;
          }
        };
        console.log(_var_108);
      }
      function kJ() {
        function iJ(...Jx) {
          Ox = Jx;
          return hx[xx].apply(this);
        }
        let _var_b9 = ux[xx];
        if (_var_b9) {
          (function (xx, Jx = 1) {
            Object.defineProperty(xx, "length", {
              value: Jx,
              configurable: false
            });
          })(iJ, _var_b9);
        }
        return iJ;
      }
      if (vx(119) in Kx) {
        bx();
      }
      Px = Ex[xx] ||= kJ();
    } else {
      Px = hx[xx]();
    }
    if (iJ === vx(121) + vx(122)) {
      return {
        AKhtlaIEv3: Px
      };
    }
    {
      return Px;
    }
  }
  function ox(xx) {
    for (let iJ = 0; iJ < hx.i; iJ++) {
      var Jx;
      const ux = xx.getItemAtIdx(iJ);
      if (ux !== null && ux !== undefined && (Jx = ux.name) !== null && Jx !== undefined && Jx.includes("Firecracker")) {
        return iJ;
      }
    }
    return null;
  }
  function rx(xx, Jx, iJ) {
    const ux = Date.now();
    const jJ = xx.bloxd.isClient ? 1 : 0.8;
    const vx = Fx.k.gliderFuelCooldown * jJ;
    iJ.gliderFuelCooldownEnd = ux + vx;
    if (xx.bloxd.isClient) {
      ex.f.Sx("middleScreenBarInitiate", {
        duration: vx,
        iF: true,
        horizBarRemOffset: 0
      });
    }
  }
  function Zx(xx, Jx, iJ) {
    iJ.gliderFuelCooldownEnd = 0;
  }
  Rx = {};
  bx = function () {
    let _var_a10 = [function () {
      return globalThis;
    }, function () {
      return global;
    }, function () {
      return window;
    }, function () {
      return new Function("return this")();
    }];
    let _var_140 = undefined;
    let _var_141 = [];
    try {
      _var_140 = Object;
      _var_141.push("".__proto__.constructor.name);
    } catch (yx) {}
    xx: for (let _var_d7 = 0; _var_d7 < _var_a10.length; _var_d7++) {
      try {
        _var_140 = _var_a10[_var_d7]();
        let _var_142 = 0;
        for (; _var_142 < _var_141.length; _var_142++) {
          if (typeof _var_140[_var_141[_var_142]] === "undefined") {
            continue xx;
          }
        }
        return _var_140;
      } catch (yx) {}
    }
    return _var_140 || this;
  }() || {};
  kJ = bx.TextDecoder;
  qx = bx.Uint8Array;
  mJ = bx.bx;
  Wx = bx.String || String;
  Mx = bx.Array || Array;
  cx = function () {
    let _var_c2 = new Mx(128);
    let _var_143 = Wx.fromCodePoint || Wx.fromCharCode;
    let _var_144 = [];
    return function (Jx) {
      var iJ = ux;
      var ux;
      var jJ;
      var vx;
      ux = undefined;
      jJ = Jx.length;
      _var_144.length = 0;
      vx = 0;
      while (vx < jJ) {
        ux = Jx[vx++];
        if (ux <= 127) {} else if (ux <= 223) {
          iJ = (ux & 31) << 6 | Jx[vx++] & 63;
        } else if (ux <= 239) {
          iJ = (ux & 15) << 12 | (Jx[vx++] & 63) << 6 | Jx[vx++] & 63;
        } else if (Wx.fromCodePoint) {
          iJ = (ux & 7) << 18 | (Jx[vx++] & 63) << 12 | (Jx[vx++] & 63) << 6 | Jx[vx++] & 63;
        } else {
          iJ = 63;
          vx += 3;
        }
        _var_144.push(_var_c2[iJ] ||= _var_143(iJ));
      }
      return _var_144.join("");
    };
  }();
  Ex = Object.create(null);
  Ox = undefined;
  lx = function (xx, Jx = 1) {
    Object.defineProperty(xx, "length", {
      value: Jx,
      configurable: false
    });
    return xx;
  }(function (...xx) {
    Ox = [xx, {}];
    return new dx("8XLOXR", "CHxSJdWWcA", "rq0gbB1EtW").AKhtlaIEv3;
  }, 6);
};