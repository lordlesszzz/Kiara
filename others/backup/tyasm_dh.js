
/*
统一阿萨姆兑换

多账号@
export tyxq = ""

cron: 0 0 * * *
*/
const $ = new Env('统一阿萨姆兑换')
const CryptoJS = require('crypto-js')
const { Worker, isMainThread, workerData } = require('worker_threads')
const sign = new Sign()

let cookie = `8937bf806ffa258b56efce6d3db3618c52d4d2f6a9ee8c3123a0588402afb586cb7250237f8f85cf896bd21601811100
018087c206b194c5e5f2044f155c8f34029b16953f4ded5178b08e53f0fa4994a17dd028146ff70cfb0d0d127b29a05f
7d6311d2b1244911b8355fe4dfa377b0f3eafe71e1c6caba29c6f93e1b57cb0bbabf8dabca1989556cd1267ee42c8951
5c0c62f4650e743d0a6c5d0efbb8a338ddd6defc890403a972631b044be9eb4af9e8e60e4d1e6350a0652f475cc7d637`
let cookieArr = [],
  token = '',
  userList = [],
  envName = 'tyxq',
  configName = 'tyxq',
  exchangeList = ['京东E卡50元', '京东E卡10元'],
  reTry = 5
cookie = cookie || process.env[envName]
exchangeList = ['SMILEY 旅行箱']
!(async () => {

  if (isMainThread) {
    await checkEnv()
    if (cookieArr.length == 0) {
      if (!$.envFormat(envName)) return
    }
    // console.log(`\n共${cookieArr.length}个账号`)
    $.index = 0
    for (let item of JSON.parse(JSON.stringify(cookieArr))) {
      token = item
      await getUserList()
      $.index++
    }
    //线程数
    const threadCount = +process.env.threadCount || cookieArr.length
    const threads = new Set()
    // console.log(`\n共${threadCount}个线程...`)

    for (let i = 0; i < threadCount; i++) {
      threads.add(new Worker(__filename, { 
        workerData: { 
          cookie: cookieArr[i], 
          index: i,
          userList
        }, 
      }))
    }

    for (let worker of threads) {
      worker.on('error', (err) => { throw err })
      worker.on('exit', () => {
        threads.delete(worker)
        if (threads.size === 0) {
          // console.log(`\n线程结束`)
        }
      })
    }

  } else {
    $.index = workerData.index
    token = workerData.cookie
    userList = workerData.userList
    console.log('! / userList:', userList)
    let user = userList[$.index]
    if (!user) return
    $.authToken = user.authToken
    // $.shareCode = user.shareCode
    $.nickName = user.nickName
    $.wid = user.wid
    $.logPrefix = `【账号${$.index + 1}】${$.nickName || ''} `
    $.log(`\n*******${$.logPrefix}******* `)
    await asmExchange()

  }
})().catch(err => {
  $.log(err)
}).finally(() => {
  // $.done()
})

async function asmExchange() {
  $.log(`\n== 消消乐兑换 ==`)
  $.host = `um.ioutu.cn`
  $.platform = 'web'
  $.signKey = 'DNYj@23#dsfj&*1sjs'
  $.skey = ''

  await getGoodList()
  for (let exchangeGood of exchangeList) {
    for (let good of $.goodList) {
      if (good) {
        let { title, skuList } = good.spuDTO
        let sku = skuList[0]
        if (title.includes(exchangeGood)) {
          $.logThread(`\n兑换${sku.title}...`)
          $.price = sku.priceList[0].price
          await goodCommit(sku)
          if ($.exchangeRes.msg.includes('服务器正忙')) {
            $.logThread(`重试...`)
            for (let i = 0; i < reTry; i++) {
              await goodCommit(good)
              if ($.exchangeRes.success) break
              $.logThread(`重试最后一次, 跳出!`)
            }
            break
          }
        }
      }
    }
  }

  async function getGoodList() {
    let opts = taskAsmmpUrl(`api/asmmp/common/pointmallc/v1/goods/spuSearch`, {
      pageNum: 1,
      pageSize: 10
    })
    let res = await $.http({
      method: 'post',
      ...opts
    })
    console.log('getGoodList / res:', res)
    res = $.toObj(res)
    if (res.success) {
      $.goodList = res.data?.dataList
    } else {
      $.logThread(`${res.msg}`)
    }
  }

  async function goodCommit(good) {
    let opts = taskAsmmpUrl(`api/asmmp/common/pointmallc/v1/trade/commitSettle`, {
      "marketingType": "INTEGRAL",
      "ext": {
        "UMA_POINT_MALL_KA_SOURCE": "ASM",
        "NEED_CARD_INFO": false,
        "Need_Auto_Address": 1
      },
      "storeGoodsList": [
        {
          "goodsList": [
            {
              "skuId": good.skuId,
              "spuId": good.spuId,
              "quantity": 1
            }
          ]
        }
      ]
    })
    let res = await $.http({
      method: 'post',
      ...opts
    })
    res = $.toObj(res)
    $.exchangeRes = res
    if (res.success) {
      try {
        $.integral = res.data?.storeGoodsList[0].goodsList[0].integral
      } catch (e) {
        $.integral = $.price
      }
      await goodOrder(good)
    } else {
      $.logThread(`${res.msg}`)
    }
  }

  async function goodOrder(good) {
    let opts = taskAsmmpUrl(`api/asmmp/common/pointmallc/v1/trade/createOrder`, {
      "marketingType": "INTEGRAL",
      "ext": {
        "UMA_POINT_MALL_KA_SOURCE": "ASM",
        "NEED_CARD_INFO": false,
        "Need_Auto_Address": 1
      },
      "storeGoodsList": [
        {
          "goodsList": [
            {
              "skuId": good.skuId,
              "spuId": good.spuId,
              "quantity": 1
            }
          ]
        }
      ],
      "payIntegral": $.integral,
      "marketingType": "INTEGRAL",
      "totalDeliveryFee": "0",
      "payAmount": "0"
    })
    let res = await $.http({
      method: 'post',
      ...opts
    })
    res = $.toObj(res)
    if (res.success) {
      $.logThread(`兑换成功`)
    } else {
      $.logThread(`${res.msg}`)
    }
  }

  function taskResolve(key) {
    switch (key) {
      case 'inviteTask':
        return {
          name: `每日活动分享`,
          umaData: JSON.stringify({
            sceneKey: 'asm_mrfxyl'
          })
        }
      case 'gameTask':
        return {
          name: `开心消消乐`,
          umaData: JSON.stringify({
            sceneKey: 'asm_mrkxxxl'
          })
        }
      case 'signTask':
        return {
          name: `每日签到`,
          umaData: JSON.stringify({
            sceneKey: 'asm_mrqd'
          })
        }
      case 'glanceTask':
        return {
          name: `每日逛统一快乐星球`,
          umaData: JSON.stringify({
            sceneKey: 'asm_mrgklxq'
          })
        }
    }
  }
}

async function getUserList() {

  resolveBody()
  await userInfo()
  if (!$.loginType) {
    $.log(`【账号${$.index + 1}】cookie失效\n`)
    return
  }
  $.host = `capi.weimobcloud.com`
  $.platform = 'mpg'
  $.signKey = 'SDJk@#98&sd*SDld2d'
  await asmmpLogin()


  // $.host = `um.ioutu.cn`
  // $.platform = 'web'
  // $.signKey = 'DNYj@23#dsfj&*1sjs'
  // $.skey = ''
  // await getShareCode()

  async function asmmpLogin() {
    let loginBody = resolveBody({
      umaData: JSON.stringify({
        wid: $.wid,
        wxOpenId: $.wxOpenId,
        unionId: $.unionId,
        channelUserInfoDTO: {
          headUrl: $.headUrl,
          nickName: $.nickName,
          phone: $.phone
        }
      }),
    })
    let opts = taskAsmmpUrl(`api3/api/asmmp/common/activity/v1/user/login`, loginBody)

    let res = await $.http({
      method: 'post',
      ...opts
    })
    res = $.toObj(res)
    if (res.success) {
      let { authToken } = res.data.authTokenVO
      $.authToken = authToken
      userList[userList.length - 1].authToken = authToken
    } else {
      $.log(res.errmsg)
    }
  }

  async function getShareCode() {
    let opts = taskAsmmpUrl(`api/asmmp/activity/v1/invite/genShareCode`, {
      sceneKey: 'asm_xxl_fxyl'
    })
    let res = await $.http({
      method: 'post',
      ...opts
    })
    res = $.toObj(res)
    if (res.success) {
      let { shareCode } = res.data
      userList[userList.length - 1].shareCode = shareCode
    } else {
      $.log(`${res.msg}`)
    }
  }
}

async function userInfo() {
  let res = await $.http({
    method: 'post',
    ...taskPostUrl(`api3/onecrm/user/center/usercenter/queryUserInfo`)
  })
  res = $.toObj(res)
  if (res.errcode == 0) {
    let { nickname, headurl, wid, sourceObjectList } = res.data
    $.nickName = nickname
    $.headUrl = headurl
    $.wid = wid
    $.loginType = true
    sourceObjectList.forEach(item => {
      switch (item.source) {
        case 1:
          $.wxOpenId = item.sourceOpenId
          break
        case 2:
          $.unionId = item.sourceOpenId
          break
        case 4:
          $.phone = item.sourceOpenId
          break
      }
    })

    userList.push({
      nickName: nickname,
      headurl,
      wid,
      sourceObjectList
    })
  } else {
    $.log(res.errmsg)
    if (res.errmsg.includes('登录信息失败')) {
      $.loginType = false
      userList.push(null)
    }
  }
}

async function getPoint() {
  let res = await $.http({
    method: 'post',
    ...taskPostUrl(`api3/onecrm/point/myPoint/getSimpleAccountInfo`)
  })
  res = $.toObj(res)
  if (res.errcode == 0) {
    let { pointName, totalPoint } = res.data
    $.totalPoint = totalPoint
    $.log(`\n${pointName}：${totalPoint}`)
  } else {
    $.log(res.errmsg)
  }
}

// 营养值
async function getNutrition() {
  let opts = taskAsmmpUrl(`api/asmmp/activity/v1/asset/point/account`, {})
  let res = await $.http({
    method: 'post',
    ...opts
  })
  res = $.toObj(res)
  if (res.success) {
    let { POINT } = res.data.assetMap
    $.uid = res.data.uid
    $.point = POINT

  } else {
    $.log(`${res.msg}`)
  }

}

async function checkEnv() {
  $.cookie = cookie
  $.cookieArr = cookieArr
  if (!$.cookie) {
    const getEnv = require('./utils/config')
    let config = await getEnv(configName)
    $.cookie = config?.token
  }
}

function resolveBody(opts) {
  $.body = {
    "appid": "wx532ecb3bdaaf92f9",
    "basicInfo": { "bosId": 4020112618957, "tcode": "weimob", "cid": 176205957, "vid": 6013753979957, "productId": 146, "productInstanceId": 3168798957 },
    "extendInfo": {
      "wxTemplateId": 7083,
      "childTemplateIds": [
        { "customId": 90004, "version": "crm@0.0.159" },
        { "customId": 90002, "version": "ec@31.1" },
        { "customId": 90006, "version": "hudong@0.0.175" },
        { "customId": 90008, "version": "cms@0.0.328" }
      ], "analysis": [], "quickdeliver": { "enable": false }, "bosTemplateId": 1000001061, "youshu": { "enable": false }, "source": 1, "channelsource": 5, "refer": "cms-index", "mpScene": 1089
    },
    "queryParameter": null,
    "i18n": { "language": "zh", "timezone": "8" },
    "pid": "4020112618957",
    "storeId": "0",
    "source": 2,
    "request": {},
    "targetBasicInfo": { "productInstanceId": 3168798957, "productId": 146 }
  }
  return {
    ...$.body,
    ...opts
  }
}

function taskAsmmpUrl(path, body) {
  let req = {
    url: `https://${$.host}/${path}`,
    headers: {
      'auth-token': $.authToken || '',
      'cloud-app-id': '31536475456-asmxiangmu-pod',
      'X-WX-Token': token,
      'content-type': 'application/json;charset=UTF-8',
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.40(0x1800282a) NetType/WIFI Language/zh_CN',
    },
    body: body ? JSON.stringify(body) : JSON.stringify(resolveBody())
  }
  return signResolve(req)
}

function taskPostUrl(path, body) {
  return {
    url: `https://xapi.weimob.com/${path}`,
    headers: {
      Host: 'xapi.weimob.com',
      // Cookie: `${cookie}`,
      'X-WX-Token': token || '',
      'content-type': ' application/json',
      'Accept': '*/*',
      'Connection': 'keep-alive',
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.40(0x1800282a) NetType/WIFI Language/zh_CN',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : JSON.stringify($.body)
  }
}

function encodeXXL(gameLogVOList) {
  let e
  if (gameLogVOList) {
    e = JSON.stringify({
      gameLogVOList,
      lastReportId: $.reportId || 0,
      playId: $.playId,
    })
  } else {
    e = JSON.stringify({
      gamePoint: $.gamePoint,
      playId: $.playId,
    })
  }

  var t = $.uid,
    n = CryptoJS.enc.Utf8.parse(t),
    r = CryptoJS.DES.encrypt(e, n, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    })
  return CryptoJS.enc.Base64.stringify(r.ciphertext)
}

function signResolve(opts) {
  let { headers, body } = opts
  let ruleArr = ['signKey', 'skey', 'body', 'nonce', 'ts']
  // $.signKey = 'SDJk@#98&sd*SDld2d'
  // $.skey = headers['auth-token' || '']
  if ($.host.includes('weimobcloud')) $.skey = headers['auth-token' || '']
  let signHeader = sign.getSignHeaders({
    signKey: $.signKey,
    skey: $.skey,
    body: JSON.parse(body).umaData || body
  }, ruleArr, $.platform)

  return {
    ...opts,
    headers: {
      ...headers,
      ...signHeader
    }
  }
}

function Sign() {
  return new (class {
    constructor() {
      this.o = { updateTime: 0, serverTime: 0, requestTime: 0 }
    }
    get() {
      var e =
        arguments.length > 0 &&
        void 0 !== arguments[0] &&
        arguments[0],
        t =
          arguments.length > 1 &&
          void 0 !== arguments[1] &&
          arguments[1]
      if (!t) return this._get(e, this.o)
      var n = this._get(!0, this.o)
      return n || this._get(e, this.o)
    }
    _get(e, t) {
      return t.serverTime || e
        ? t.serverTime
          ? t.serverTime + (Date.now() - t.updateTime)
          : 0
        : Date.now()
    }
    nonce() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
        /[xy]/g,
        function (e) {
          var t = (16 * Math.random()) | 0
          return ('x' == e ? t : (3 & t) | 8).toString(16)
        }
      )
    }
    _sign(e) {
      var t,
        n,
        r = new Uint8Array(
          (function (e) {
            var t,
              n,
              r,
              o = []
            for (t = 0; t < e.length; t++)
              (n = e.charCodeAt(t)) < 128
                ? o.push(n)
                : n < 2048
                  ? o.push(192 + ((n >> 6) & 31), 128 + (63 & n))
                  : ((r = 55296 ^ n) >> 10 == 0
                    ? ((n =
                      (r << 10) +
                      (56320 ^ e.charCodeAt(++t)) +
                      65536),
                      o.push(
                        240 + ((n >> 18) & 7),
                        128 + ((n >> 12) & 63)
                      ))
                    : o.push(224 + ((n >> 12) & 15)),
                    o.push(128 + ((n >> 6) & 63), 128 + (63 & n)))
            return o
          })(e)
        ),
        o = 16 + (((r.length + 8) >>> 6) << 4)
      for (
        (e = new Uint8Array(o << 2)).set(new Uint8Array(r.buffer)),
        e = new Uint32Array(e.buffer),
        n = new DataView(e.buffer),
        d = 0;
        d < o;
        d++
      )
        e[d] = n.getUint32(d << 2)
          ; (e[r.length >> 2] |= 128 << (24 - 8 * (3 & r.length))),
            (e[o - 1] = r.length << 3)
      var a = [],
        s = [
          function () {
            return (u[1] & u[2]) | (~u[1] & u[3])
          },
          function () {
            return u[1] ^ u[2] ^ u[3]
          },
          function () {
            return (u[1] & u[2]) | (u[1] & u[3]) | (u[2] & u[3])
          },
          function () {
            return u[1] ^ u[2] ^ u[3]
          },
        ],
        c = function (e, t) {
          return (e << t) | (e >>> (32 - t))
        },
        i = [1518500249, 1859775393, -1894007588, -899497514],
        u = [1732584193, -271733879, null, null, -1009589776]
      for (u[2] = ~u[0], u[3] = ~u[1], d = 0; d < e.length; d += 16) {
        var l = u.slice(0)
        for (t = 0; t < 80; t++)
          (a[t] =
            t < 16
              ? e[d + t]
              : c(a[t - 3] ^ a[t - 8] ^ a[t - 14] ^ a[t - 16], 1)),
            (n =
              (c(u[0], 5) +
                s[(t / 20) | 0]() +
                u[4] +
                a[t] +
                i[(t / 20) | 0]) |
              0),
            (u[1] = c(u[1], 30)),
            u.pop(),
            u.unshift(n)
        for (t = 0; t < 5; t++) u[t] = (u[t] + l[t]) | 0
      }
      n = new DataView(new Uint32Array(u).buffer)
      for (var d = 0; d < 5; d++) u[d] = n.getUint32(d << 2)
      return Array.prototype.map
        .call(new Uint8Array(new Uint32Array(u).buffer), function (e) {
          return (e < 16 ? '0' : '') + e.toString(16)
        })
        .join('')
    }
    getSign(t, n) {
      return ((n) => {
        t.nonce = t.nonce || this.nonce()
        t.ts = t.ts || this.get(!1, !0)
        if ('object' == typeof t.body)
          try {
            t.body = JSON.stringify(t.body)
          } catch (n) {
            t.body = ''
          }
        n = n
          .map(function (e) {
            return t[e]
          })
          .join(';')
        var o = this._sign(n)
        return (
          { nonce: t.nonce, ts: t.ts, sign: o }
        )
      })(n)
    }

    getSignHeaders(e = {}, t = [], n) {
      return ((e) => {
        var o = {}
        return (
          (e = this.getSign(e, t)) &&
          Object.assign(o, {
            'x-sign': e.sign,
            'x-ts': e.ts,
            'x-nonce': e.nonce,
            'x-platform': n,
          }),
          o
        )
      })(e)
    }

  })()
}


// prettier-ignore
function Env(t, e) { return new class { constructor(t, e) { this.name = t, this.nickName = "", this.data = null, this.index = "", this.cookie = "", this.cookieArr = [], this.splitor = "@", this.envSplitor = ["@", "\n"], this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.logPrefix = `【账号${this.index}】${this.nickName || ""}`, this.encoding = "utf-8", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } loaddata() { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), o = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, o) : i ? this.fs.writeFileSync(e, o) : this.fs.writeFileSync(t, o) } } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"], delete t.headers["content-type"], delete t.headers["content-length"]); let s = require("iconv-lite"); this.initGotEnv(t), this.got(t).on("redirect", ((t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } })).then((t => { const { statusCode: i, statusCode: o, headers: h, rawBody: r } = t, n = s.decode(r, this.encoding); e(null, { status: i, statusCode: o, headers: h, rawBody: r, body: n }, n) }), (t => { const { message: i, response: o } = t; e(i, o, o && s.decode(o.rawBody, this.encoding)) })) } post(t, e = (() => { })) { const s = t.method ? t.method.toLocaleLowerCase() : "post"; t.body && t.headers && !t.headers["Content-Type"] && !t.headers["content-type"] && (t.headers["content-type"] = "application/x-www-form-urlencoded"), t.headers && (delete t.headers["Content-Length"], delete t.headers["content-length"]); let i = require("iconv-lite"); this.initGotEnv(t); const { url: o, ...h } = t; this.got[s](o, h).then((t => { const { statusCode: s, statusCode: o, headers: h, rawBody: r } = t, n = i.decode(r, this.encoding); e(null, { status: s, statusCode: o, headers: h, rawBody: r, body: n }, n) }), (t => { const { message: s, response: o } = t; e(s, o, o && i.decode(o.rawBody, this.encoding)) })) } http(t = {}) { let { method: e = "get", url: s, headers: i, body: o } = t, h = { url: s, headers: i }; return "post" === e && (h.body = o), new Promise((async t => { this[e](h, (async (e, s, i) => { try { e && (console.log(`${JSON.stringify(e)}`), console.log(`${this.name} API请求失败，请检查网路重试`)) } catch (t) { $.logThreadErr(t) } finally { t(i) } })) })) } envFormat(t) { if (this.cookie) { for (let t of this.envSplitor) if (this.cookie.indexOf(t) > -1) { this.splitor = t; break } return this.cookie.split(this.splitor).forEach((t => this.cookieArr.push(t))), !0 } console.log(`\n未填写变量${t}`) } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } queryStr(t) { let e = ""; for (const s in t) { let i = t[s]; null != i && "" !== i && ("object" == typeof i && (i = JSON.stringify(i)), e += `${s}=${i}&`) } return e = e.substring(0, e.length - 1), e } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logThread(...t) { (t = t.map((t => t ? t.startsWith("\n") ? `\n${this.logPrefix}${t.substring(1)}` : `${this.logPrefix}${t}` : t))).length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { this.log("", `❗️${this.name}, 错误!`, t.stack) } wait(t) { return new Promise((e => setTimeout(e, t))) } done(t = {}) { const e = ((new Date).getTime() - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${e} 秒`), this.log(), process.exit(1) } start() { this.log(`${this.name}, 开始!`) } end(t = {}) { const e = ((new Date).getTime() - this.startTime) / 1e3; this.log("", `${this.name}, 结束! 🕛 ${e} 秒`) } }(t, e) }