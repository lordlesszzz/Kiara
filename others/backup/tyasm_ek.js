
/*
统一阿萨姆兑换

多账号@
export tyxq = ""

cron: 0 0 * * *
*/
const $ = new Env('统一阿萨姆兑换')
const CryptoJS = require('crypto-js')
const asmGoodList = require('./asmGoodList.json')
const sign = new Sign()

const prefixFlag = true, timeFlag = true

let cookie = ''
let cookieArr = [],
  token = '',
  userList = [],
  asmTokenArr = [],
  envName = 'tyxq',
  configName = 'tyxq',
  exchangeNum = 5,
  exchangeList = ['SMILEY 旅行箱', 'SMILEY 帆布袋', '京东E卡50元', '京东E卡10元', '快乐星球10积分', '开心刮刮卡'],
  reTry = 20
cookie = cookie || process.env[envName]

exchangeList = ['京东E卡50元', '京东E卡10元']
exchangeList = ['SMILEY 旅行箱', 'SMILEY 帆布袋']
asmTokenArr = [
  '49ea35b6b6edecd76c30a9545e9a71f7dad489ca7cb95216015520e56af1a40419bc1e8e70e061d872ead1bd80110c355ebb858c3bed1f786f9576f026524959480e71c037fd51a66cc498772ef0cf37f808041ae97a6060',
  '49ea35b6b6edecd76c30a9545e9a71f7dad489ca7cb95216297212f345fa01ba43878152ec704e2f72ead1bd80110c355ebb858c3bed1f78fde5c34a657005f3365ec101a5ebb35b6cc498772ef0cf37f9af73b90c0c2d69',
  '49ea35b6b6edecd76c30a9545e9a71f7dad489ca7cb952168f38bf38a16b45df759f7b18fb94b2ed72ead1bd80110c355ebb858c3bed1f781394da7903214b64d53a2f8341e5ded66cc498772ef0cf376ca88969a5523b0f',
  '49ea35b6b6edecd76c30a9545e9a71f7dad489ca7cb95216e8ca87bd6dc3ea5a7143a7109d013a2b72ead1bd80110c355ebb858c3bed1f788aa5e492567febde7be0e9abc1d4d2a46cc498772ef0cf3744b6be599ba23141',
]

!(async () => {
  $.init({ prefixFlag, timeFlag })
  if ($.isMainThread) {

    if (asmTokenArr.length == 0) {
      await checkEnv()
      if (cookieArr.length == 0) {
        if (!$.envFormat(envName)) return
      }
      console.log(`\n共${cookieArr.length}个账号`)
      $.index = 0
      for (let item of JSON.parse(JSON.stringify(cookieArr))) {
        token = item
        await getUserList()
        $.index++
      }
    } else {
      console.log(`\n共${asmTokenArr.length}个账号`)
    }

    // console.log('! / asmTokenArr:', asmTokenArr)
    //线程数
    const threadCount = +process.env.threadCount || cookieArr.length || asmTokenArr.length
    const threads = new Set()
    // console.log(`\n共${threadCount}个线程...`)

    for (let i = 0; i < threadCount; i++) {
      threads.add(new $.Worker(__filename, {
        workerData: {
          cookie: cookieArr[i],
          index: i,
          userList,
          asmTokenArr
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
    $.index = $.workerData.index
    token = $.workerData.cookie
    userList = $.workerData.userList
    asmTokenArr = $.workerData.asmTokenArr
    $.goodList = asmGoodList
    if (userList.length != 0) {
      let user = userList[$.index]
      if (!user) return
      $.authToken = user.authToken
      $.nickName = user.nickName
    } else {
      if (!asmTokenArr[$.index]) return
      $.authToken = asmTokenArr[$.index]
    }


    $.logPrefix = `【账号${$.index + 1}】${$.nickName || ''} `
    $.log(`\n*******${$.logPrefix}******* `, { prefixless: true, timeless: true })
    await asmExchange()

  }
})().catch(err => {
  $.logErr(err)
}).finally(() => {
  // $.done()
})

async function asmExchange() {
  // $.log(`\n== 消消乐兑换 ==`)
  $.host = `um.ioutu.cn`
  $.platform = 'web'
  $.signKey = 'DNYj@23#dsfj&*1sjs'
  $.skey = ''

  // await getGoodList()
  for (let exchangeGood of exchangeList) {
    for (let good of $.goodList) {
      if (good) {
        let { title, skuList } = good.spuDTO
        let sku = skuList[0]
        if (title.includes(exchangeGood)) {
          $.log(`\n兑换${sku.title}...`)
          $.price = sku.priceList[0].price
          for (let i = 0; i < exchangeNum; i++) {
            await goodCommit(sku)
            if ($.exchangeRes.msg.includes('服务器正忙')) {
              $.log(`重试...`)
              for (let j = 0; j < reTry; j++) {
                await goodCommit(sku)
                if ($.exchangeRes.success) break
                if (j == reTry - 1) $.log(`重试最后一次, 跳出!`)
              }
            } else if ($.exchangeRes.msg.includes('全部商品无货')) {
              break
            }

          }
        }
      }
    }
  }

  // await goodCommit(sku)



  async function getGoodList() {
    let opts = taskAsmmpUrl(`api/asmmp/common/pointmallc/v1/goods/spuSearch`, {
      pageNum: 1,
      pageSize: 10
    })
    let res = await $.http({
      method: 'post',
      ...opts
    })
    res = $.toObj(res)
    if (res.success) {
      $.goodList = res.data?.dataList
    } else {
      $.log(`${res.msg}`)
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
      $.log(`${res.msg}`)
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
      $.log(`兑换成功`)
    } else {
      $.log(`${res.msg}`)
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
      asmTokenArr.push(authToken)
      userList[userList.length - 1].authToken = authToken
    } else {
      $.log(res.errmsg)
      asmTokenArr.push(false)
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
function Env(name, opts) {
  return new (class {
    constructor(name, opts) {
      this.name = name
      this.logSeparator = '\n'
      this.encoding = 'utf-8'
      this.startTime = new Date().getTime()
      this.init()
      Object.assign(this, opts)
      this.log(`\n[${this.name}], 开始!`, { time: true, console: this.isMainThread })
    }
    toObj(str, defaultValue = str) {
      try {
        return JSON.parse(str)
      } catch {
        return defaultValue
      }
    }
    toStr(obj, defaultValue = obj) {
      try {
        return JSON.stringify(obj)
      } catch {
        return defaultValue
      }
    }
    initGotEnv(opts) {
      this.got = this.got ? this.got : require('got')
      this.cktough = this.cktough ? this.cktough : require('tough-cookie')
      this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar()
      if (opts) {
        opts.headers = opts.headers ? opts.headers : {}
        if (undefined === opts.headers.Cookie && undefined === opts.cookieJar) {
          opts.cookieJar = this.ckjar
        }
      }
    }
    get(request, callback = () => { }) {
      if (request.headers) {
        delete request.headers['Content-Type']
        delete request.headers['Content-Length']

        // HTTP/2 全是小写
        delete request.headers['content-type']
        delete request.headers['content-length']
      }

      let iconv = require('iconv-lite')
      this.initGotEnv(request)
      this.got(request)
        .on('redirect', (resp, nextOpts) => {
          try {
            if (resp.headers['set-cookie']) {
              const ck = resp.headers['set-cookie']
                .map(this.cktough.Cookie.parse)
                .toString()
              if (ck) {
                this.ckjar.setCookieSync(ck, null)
              }
              nextOpts.cookieJar = this.ckjar
            }
          } catch (e) {
            this.logErr(e)
          }
          // this.ckjar.setCookieSync(resp.headers['set-cookie'].map(Cookie.parse).toString())
        })
        .then(
          (resp) => {
            const {
              statusCode: status,
              statusCode,
              headers,
              rawBody
            } = resp
            const body = iconv.decode(rawBody, this.encoding)
            callback(
              null,
              { status, statusCode, headers, rawBody, body },
              body
            )
          },
          (err) => {
            const { message: error, response: resp } = err
            callback(
              error,
              resp,
              resp && iconv.decode(resp.rawBody, this.encoding)
            )
          }
        )
    }
    post(request, callback = () => { }) {
      const method = request.method
        ? request.method.toLocaleLowerCase()
        : 'post'

      // 如果指定了请求体, 但没指定 `Content-Type`、`content-type`, 则自动生成。
      if (
        request.body &&
        request.headers &&
        !request.headers['Content-Type'] &&
        !request.headers['content-type']
      ) {
        // HTTP/1、HTTP/2 都支持小写 headers
        request.headers['content-type'] = 'application/x-www-form-urlencoded'
      }
      // 为避免指定错误 `content-length` 这里删除该属性，由工具端 (HttpClient) 负责重新计算并赋值
      if (request.headers) {
        delete request.headers['Content-Length']
        delete request.headers['content-length']
      }
      let iconv = require('iconv-lite')
      this.initGotEnv(request)
      const { url, ..._request } = request
      this.got[method](url, _request).then(
        (resp) => {
          const { statusCode: status, statusCode, headers, rawBody } = resp
          const body = iconv.decode(rawBody, this.encoding)
          callback(
            null,
            { status, statusCode, headers, rawBody, body },
            body
          )
        },
        (err) => {
          const { message: error, response: resp } = err
          callback(
            error,
            resp,
            resp && iconv.decode(resp.rawBody, this.encoding)
          )
        }
      )
    }
    envFormat(envName) {
      if (this.cookieArr.length) return true
      if (this.cookie) {
        for (let sp of this.envSplitor) {
          if (this.cookie.indexOf(sp) > -1) {
            this.splitor = sp
            break
          }
        }
        this.cookie.split(this.splitor).forEach(cookie => this.cookieArr.push(cookie))
        return true
      } else {
        console.log(`\n未填写变量[${envName}]`)
        return
      }
    }
    /**
     * 示例:$.time('yyyy-MM-dd qq HH:mm:ss.S')
     *    :$.time('yyyyMMddHHmmssS')
     *    y:年 M:月 d:日 q:季 H:时 m:分 s:秒 S:毫秒
     *    其中y可选0-4位占位符、S可选0-1位占位符，其余可选0-2位占位符
     * @param {string} fmt 格式化参数
     * @param {number} 可选: 根据指定时间戳返回格式化日期
     */
    time(fmt, ts = null) {
      const date = ts ? new Date(ts) : new Date()
      let o = {
        'M+': date.getMonth() + 1,
        'd+': date.getDate(),
        'H+': date.getHours(),
        'm+': date.getMinutes(),
        's+': date.getSeconds(),
        'q+': Math.floor((date.getMonth() + 3) / 3),
        'S': date.getMilliseconds()
      }
      if (/(y+)/.test(fmt))
        fmt = fmt.replace(
          RegExp.$1,
          (date.getFullYear() + '').substr(4 - RegExp.$1.length)
        )
      for (let k in o)
        if (new RegExp('(' + k + ')').test(fmt))
          fmt = fmt.replace(
            RegExp.$1,
            RegExp.$1.length == 1
              ? o[k]
              : ('00' + o[k]).substr(('' + o[k]).length)
          )
      return fmt
    }
    queryStr(opts) {
      let queryString = ''
      for (const key in opts) {
        let value = opts[key]
        if (value != null && value !== '') {
          if (typeof value === 'object') {
            value = JSON.stringify(value)
          }
          queryString += `${key}=${value}&`
        }
      }
      queryString = queryString.substring(0, queryString.length - 1)
      return queryString
    }
    log(...logs) {
      if (logs.length <= 0) return
      let logPrefix = ''
      let opt = { console: true }
      if (logs[logs.length - 1] instanceof Object) Object.assign(opt, logs.pop())

      if (!opt.timeless) {
        if (opt.time || this.timeFlag) {
          let fmt = opt.fmt || 'HH:mm:ss'
          logPrefix = `[${this.time(fmt)}]`
        }
      }

      if (!opt.prefixless) {
        if (opt.prefix || this.threadFlag || this.prefixFlag) {
          if (this.logPrefix) {
            logPrefix += this.logPrefix
          } else {
            if (this.user) {
              logPrefix += `账号[${this.user.userIdx}]`
              if (this.user.nickName) logPrefix += `[${this.user.nickName}]`
            }
          }

        }
      }

      if (opt.logPrefix) {
        logPrefix = opt.logPrefix
      }

      logs = logs.map(log => {
        if (typeof log !== 'string') log = this.toStr(log)
        return log ? (log.startsWith('\n') ? `\n${logPrefix}${log.substring(1)}` : `${logPrefix}${log}`) : log
      })
      if (opt.notify && this.notifyStr) this.notifyStr = [...this.notifyStr, ...logs]
      if (opt.console) console.log(logs.join(this.logSeparator))
    }
    logErr(err) {
      this.log('', `❗️${this.name}, 错误!`, err.stack)
    }
    wait(time) {
      return new Promise((resolve) => setTimeout(resolve, time))
    }
    init(opts = {}) {
      const { Worker, isMainThread, parentPort, workerData } = require('worker_threads')
      let {
        cookie = '',
        envName = '',
        configName = '',
        notifyFlag = true,
        threadFlag = false,
        prefixFlag = false,
        timeFlag = false,
        DEFAULT_TIMEOUT = 8000,
        DEFAULT_RETRY = 3,
      } = opts
      this.userIdx = 0
      this.userList = []
      this.retryNum = DEFAULT_RETRY
      this.splitor = '@'
      this.envSplitor = ['@', '\n']
      this.nickName = ''
      this.index = ''

      this.cookie = cookie
      this.cookieArr = []

      this.notifyStr = []
      this.notifyFlag = notifyFlag
      this.threadFlag = threadFlag
      this.prefixFlag = prefixFlag
      this.timeFlag = timeFlag

      this.envName = envName
      this.configName = configName

      this.got = this.got ? this.got : require('got')
      this.got = this.got.extend({
        retry: { limit: 0 },
        timeout: DEFAULT_TIMEOUT,
      })

      this.Worker = Worker
      this.isMainThread = isMainThread
      this.parentPort = parentPort
      this.workerData = workerData

    }
    async readEnv(opts = {}) {
      this.init(opts)
      if (this.cookie) {
        for (let sp of this.envSplitor) {
          if (this.cookie.indexOf(sp) > -1) {
            this.splitor = sp
            break
          }
        }
        this.cookie.split(this.splitor).forEach(cookie => this.cookieArr.push(cookie))

      } else {
        const getEnv = require('./utils/config')
        let config = await getEnv(this.configName)
        this.cookieArr = config?.token || this.cookieArr
      }

      for (let cookie of this.cookieArr) {
        let user = {
          userIdx: this.cookieArr.indexOf(cookie) + 1,
          userCookie: cookie,
          valid: true,
        }
        this.userList.push(user)
      }
      if (!this.userList.length) {
        this.log(`\n未填写变量[${envName}]`, { notify: true })
        return
      }
      this.log(`\n共${this.userList.length}个账号`)
      return true
    }
    async request(opt = {}) {
      let resp = null, count = 0
      let fn = opt.fn || opt.url
      let DEFAULT_RETRY = this.retryNum || 3
      this.got = this.got ? this.got : require('got')
      opt.method = opt?.method?.toUpperCase() || 'GET'
      while (count++ < DEFAULT_RETRY) {
        try {
          let err = null
          const errcodes = ['ECONNRESET', 'EADDRINUSE', 'ENOTFOUND', 'EAI_AGAIN']
          await this.got(opt).then(t => {
            resp = t
          }, e => {
            err = e
            resp = e.response
          })
          if (err) {
            if (err.name == 'TimeoutError') {
              this.log(`[${fn}]请求超时(${err.code})，重试第${count}次`)
            } else if (errcodes.includes(err.code)) {
              this.log(`[${fn}]请求错误(${err.code})，重试第${count}次`)
            } else {
              let statusCode = resp?.statusCode || -1
              this.log(`[${fn}]请求错误(${err.message}), 返回[${statusCode}]`)
              break
            }
          } else {
            break
          }
        } catch (e) {
          this.log(`[${fn}]请求错误(${e.message})，重试第${count}次`)
        }
      }
      let { statusCode = -1, headers = null, body = null } = resp
      if (body) try { body = JSON.parse(body) } catch { };
      return { statusCode, headers, body }
    }
    async http(opts = {}) {
      let { fn = '', method = 'get', url, headers, body } = opts
      let options = {
        fn,
        method,
        url,
        headers
      }
      method === 'post' ? options.body = body : ''
      try {
        let { body } = await this.request(options)
        return body
      } catch (err) {
        this.logErr(err)
      }
    }
    async sendNotify() {
      if (!this.notifyStr.length) return
      try {
        const notify = require('./utils/sendNotify')
        console.log('\n------------ 推送 ------------')
        await notify.sendNotify(this.name, this.notifyStr.join('\n'))
      } catch (e) {

      }
    }
    async threadWorker(user, threads) {
      return new Promise((resolve) => {
        let worker = new this.Worker(__filename, {
          workerData: {
            user,
            userList: this.userList,
          },
        })
        worker.on('error', (err) => { throw err })
        worker.on('exit', async () => {
          resolve(worker)
          threads.delete(worker)
          if (threads.size === 0) {
            // console.log(`\n线程结束`)
          }
        })
        worker.on('message', (msg) => {
          this.notifyStr = [...this.notifyStr, ...msg]
        })
        threads.add(worker)
      })
    }
    async threads(conf, threads) {
      while (conf.idx < this.userList.length) {
        let user = this.userList[conf.idx++]
        if (!user || !user.valid) return
        await this.threadWorker(user, threads)
      }
    }
    async threadTask(thread) {
      this.log(`最大并发数：${thread}`, { prefixSpecial: true })
      const threads = new Set()
      let taskConf = { idx: 0 }
      let taskAll = []
      while (thread--) taskAll.push(this.threads(taskConf, threads))
      await Promise.all(taskAll)
    }
    async done() {
      try {
        if (!this.isMainThread) this.parentPort.postMessage(this.notifyStr)
      } catch (e) {
      }
      if (this.notifyFlag && this.isMainThread) await this.sendNotify()
      const endTime = new Date().getTime()
      const costTime = (endTime - this.startTime) / 1000
      if (this.isMainThread) {
        this.log(`\n[${this.name}], 结束! 🕛 ${costTime} 秒`, { time: true, prefixless: true })
        process.exit(1)
      }
    }
  })(name, opts)
}