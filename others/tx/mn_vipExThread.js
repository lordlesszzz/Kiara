
/*
蒙牛超级会员兑换

多账号@
export mn_superVip = ""

cron: 0,59 10,17,20,21 * * *
*/
const $ = new Env('蒙牛超级会员兑换')
const CryptoJS = require('crypto-js')
const { Worker, isMainThread, workerData } = require('worker_threads')

let cookie = `H3oijMaVT0CLtQ7ftn9f0RTHpDz1TgJwEtkJl+4ZZBOU1qAEoMNJMp/voZqjO+Wg9ETahIJ84KK+BJ6kOI1GSbyfuuPKPDJEekCMMhhO8XNZqli4ba8xSnbgSkoo0cq3J/4ceXkuJq2FQvLAYomd+kCP3Y3Ywef1sigqPzegGJ0ecrQX3AgfmNQxtBiSThjZG4f0goCf6vDatd9Yn49LWm/vsifvO3A4yflv8gX/kOeJGM9WCMG4dAQgovdpba+e`
let cookieArr = [],
  envName = 'mn_superVip',
  configName = 'mn_superVip',
  exchangeList = [],
  withdrawTime = '',
  withdrawAmount = ''
exchangeList = ['QQ音乐', 'Keep', '美团']
cookie = cookie || process.env[envName]
withdrawTime = process.env.withdrawTime || '20:59:59.555'
withdrawAmount = process.env.withdrawAmount || '5'

!(async () => {
  if (isMainThread) {
    await checkEnv()
    if (cookieArr.length == 0) {
      if (!$.envFormat(envName)) return
    }
    // console.log(`\n共${cookieArr.length}个账号`)

    //线程数
    const threadCount = +process.env.threadCount || cookieArr.length
    const threads = new Set()
    // console.log(`\n共${threadCount}个线程...`)

    for (let i = 0; i < threadCount; i++) {
      threads.add(new Worker(__filename, { workerData: { cookie: cookieArr[i], index: i } }))
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
    cookie = workerData.cookie
    await userInfo()
    $.logPrefix = `【账号${$.index + 1}】${$.phone || ''} `
    $.log(`\n*******${$.logPrefix}******* `)
    await main()

  }


})().catch(err => {
  $.logThread(err)
}).finally(() => {
  // $.done()
})


// 超级会员
async function main() {
  try {
    await exchangeTask()

    console.log('\n------------ 分割线 ------------')
    await userInfo()
    $.logThread(`\n积分：${$.coin}`, `营养值：${$.proteinBalance}`)

  } catch (e) {
    console.log(e)

  }

}

async function exchangeTask() {
  try {
    // console.log(`\n==== 秒杀 ====`)
    await goodInfo()

    $.goodList = $.seckillInfo?.goods_list
    if (!$.goodList) return
    await exchangeInit()
    for (let exchangeGood of exchangeList) {
      for (let good of $.goodList) {
        if (good) {
          let { spu_name } = good
          if (spu_name.includes(exchangeGood)) {
            $.logThread(`\n${$.time(`HH:mm:ss.S`)}`, `兑换${spu_name}...`)
            await orderConfirm(good)
          }
        }
      }
    }

  } catch (e) {
    console.log(e)
  }

  async function goodInfo() {
    let res = await $.http({
      method: 'post',
      ...taskVipUrl(`xcx/v2/mall_v2_goods_list`, getEncryptBody({
        "is_overall_sequence": 1,
        token: cookie,
        b: 2617,
        "lat": "22.74108208550347",
        "lng": "114.46782090928819"
      }))
    })
    res = $.toObj(res)
    if (res.flag == '0') {
      let { title, list } = res.data?.seckill
      $.logThread(`${title}`)
      for (let item of list) {
        let { start_hour, status_title } = item
        $.logThread(`${start_hour} 场 -- ${status_title}\n`)
        if (status_title.includes('即将开始')) {
          $.seckillInfo = item
          break
        }
      }
    }
  }

  async function orderConfirm(good) {
    let { seckill_id, sec_sku_id, sku_id, spu_id } = good
    let res = await $.http({
      method: 'post',
      ...taskVipUrl(`xcx/v2/order_seckill_confirm`, getEncryptBody({
        "goods_list": [{
          "exid": seckill_id,
          "quantity": 1,
          sec_sku_id,
          seckill_id,
          "skilltype": "积分秒杀",
          sku_id,
          spu_id
        }],
        "type": 9,
        token: cookie,
        b: 2617,
        "lat": "22.74108208550347",
        "lng": "114.46782090928819"
      }))
    })
    res = $.toObj(res)
    if (res.flag == '0') {
      let { sign, delivery } = res.data
      $.sign = sign
      $.delivery = delivery
      await orderCreate(good)
    } else {
      $.logThread(res.msg)
    }
  }

  async function orderCreate(good) {
    let { seckill_id, sec_sku_id, sku_id, spu_id } = good
    let res = await $.http({
      method: 'post',
      ...taskVipUrl(`xcx/ss/order_seckill_create`, getEncryptBody({
        "goods_list": [{
          "exid": seckill_id,
          "quantity": 1,
          sec_sku_id,
          seckill_id,
          "skilltype": "积分秒杀",
          sku_id,
          spu_id
        }],
        "type": 9,
        "sign": $.sign,
        delivery: $.delivery,
        token: cookie,
        b: 2617,
        "lat": "22.74108208550347",
        "lng": "114.46782090928819"
      }))
    })
    res = $.toObj(res)

    if (res.flag == '0') {
      let { order_id, pay: { expire_time } } = res.data
      $.order_id = order_id
      $.logThread(`兑换成功`, `订单过期时间：${expire_time}`)
    } else {
      $.logThread(res.msg)
    }
  }

  async function getOrderInfo() {
    let res = await $.http({
      method: 'post',
      ...taskVipUrl(`xcx/v2/get_order_info`, getEncryptBody({
        "id": $.order_id,
        "type": 5,
        token: cookie,
        b: 2617,
        "lat": "22.74108208550347",
        "lng": "114.46782090928819"
      }))
    })
    res = $.toObj(res)

    if (res.flag == '0') {
      let { info } = res.data
      $.logThread(`${info}`)
    } else {
      $.logThread(res.msg)
    }
  }

}

async function exchangeInit() {
  if (withdrawAmount) console.log(`当前设置提现金额：${withdrawAmount}`)
  console.log(`当前设置提现时间：${withdrawTime}`)
  console.log(`当前时间：${$.time('HH:mm:ss.S')}`)

  let [withdrawH, withdrawM, withdrawS] = withdrawTime.split(':')
  $.hour = new Date().getHours()
  $.minute = new Date().getMinutes()

  if ($.hour != `${withdrawH}`) return

  if ($.minute > withdrawM) return

  $.waitM = withdrawM - $.minute
  if ($.waitM > 5) {
    console.log(`离设定时间超过5分钟，不等待！`)
    return
  }

  $.second = $.time('ss.S')
  if ($.second < withdrawS) {
    $.waitS = withdrawS - $.second
    console.log(`\n等待时间：${$.waitM == 0 ? '' : `${$.waitM || 0}分`}${$.waitS || 0}秒`)

    let sleepTime = $.waitM * 60 + $.waitS
    while (sleepTime > 20) {
      await $.wait(20 * 1000)
      sleepTime = sleepTime - 20
      $.waitM = Math.floor((sleepTime / 60))
      $.waitS = sleepTime % 60
      console.log(`\n剩余时间：${$.waitM == 0 ? '' : `${$.waitM || 0}分`}${$.waitS || 0}秒`)
    }

    await $.wait(sleepTime * 1000)
  }

}

async function userInfo() {
  let res = await $.http({
    method: 'post',
    ...taskVipUrl(`xcx/m/user`, getEncryptBody({
      token: cookie,
      b: 2617,
      "lat": "22.74108208550347",
      "lng": "114.46782090928819"
    }))
  })
  res = $.toObj(res)
  if (res.flag == '0') {
    let { user: { name, phone, open_id, proteinBalance, coin } } = res.data
    $.phone = phone
    $.nickName = name
    $.open_id = open_id
    $.proteinBalance = proteinBalance
    $.coin = coin / 10
  }
}

async function checkEnv() {
  try {
    $.cookie = cookie
    $.cookieArr = cookieArr
    if (!$.cookie) {
      const getEnv = require('./utils/config')
      let config = await getEnv(configName)
      cookieArr = config?.token
    }
  } catch (e) {
    console.log(`读取环境变量...`)
  }
}

function getEncryptBody(e) {
  var t,
    n,
    o,
    i,
    s,
    r,
    u,
    l,
    d = Date.now(),
    g = 'tMFw=RXrEF7y^=7QXy2h2C_g_^',
    f =
      ((n = 'YYYY-MM-DD hh:mm:ss'),
        (o = (t = (t = d) ? new Date(t) : new Date()).getFullYear()),
        (i = t.getMonth() + 1),
        (s = t.getDate()),
        (r = t.getHours()),
        (u = t.getMinutes()),
        (l = t.getSeconds()),
        n.replaceAll(
          /(?:YYYY)|(?:MM)|(?:DD)|(?:hh)|(?:mm)|(?:ss)/g,
          function (e) {
            switch (e) {
              case 'YYYY':
                return o
              case 'MM':
                return i >= 10 ? i : '0'.concat(i)
              case 'DD':
                return s >= 10 ? s : '0'.concat(s)
              case 'hh':
                return r >= 10 ? r : '0'.concat(r)
              case 'mm':
                return u >= 10 ? u : '0'.concat(u)
              case 'ss':
                return l >= 10 ? l : '0'.concat(l)
            }
          }
        ))
  d = Math.floor(d / 1e3)
  var p = CryptoJS
    .MD5(g + f + d)
    .toString()
    .substring(8, 24)
  p = CryptoJS.enc.Utf8.parse(p)
  var h = CryptoJS
    .MD5(f + d + g)
    .toString()
    .substring(8, 24)
  h = CryptoJS.enc.Utf8.parse(h)
  var w = CryptoJS.enc.Utf8.parse(JSON.stringify(e))
  return {
    encode: CryptoJS.AES.encrypt(w, p, {
      iv: h,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.ZeroPadding,
    }).toString(),
    t: d,
    bd: '2617',
  }
}

function taskVipUrl(path, body) {
  let opts = {
    url: `https://m.pailifan.com/${path}`,
    headers: {
      'content-type': 'application/json',
      token: cookie,
      'b': '2617',
      'User-Agent': 'Mozilla / 5.0(iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit / 605.1.15(KHTML, like Gecko) Mobile / 15E148 MicroMessenger / 8.0.40(0x18002831) NetType / WIFI Language / zh_CN'
    },
  }
  if (body) opts.body = JSON.stringify(body)
  return opts
}



// prettier-ignore
function Env(t, e) { return new class { constructor(t, e) { this.name = t, this.nickName = "", this.data = null, this.index = "", this.cookie = "", this.cookieArr = [], this.splitor = "@", this.envSplitor = ["@", "\n"], this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.logPrefix = `【账号${this.index}】${this.nickName || ""}`, this.encoding = "utf-8", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } loaddata() { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), o = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, o) : i ? this.fs.writeFileSync(e, o) : this.fs.writeFileSync(t, o) } } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"], delete t.headers["content-type"], delete t.headers["content-length"]); let s = require("iconv-lite"); this.initGotEnv(t), this.got(t).on("redirect", ((t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } })).then((t => { const { statusCode: i, statusCode: o, headers: h, rawBody: r } = t, n = s.decode(r, this.encoding); e(null, { status: i, statusCode: o, headers: h, rawBody: r, body: n }, n) }), (t => { const { message: i, response: o } = t; e(i, o, o && s.decode(o.rawBody, this.encoding)) })) } post(t, e = (() => { })) { const s = t.method ? t.method.toLocaleLowerCase() : "post"; t.body && t.headers && !t.headers["Content-Type"] && !t.headers["content-type"] && (t.headers["content-type"] = "application/x-www-form-urlencoded"), t.headers && (delete t.headers["Content-Length"], delete t.headers["content-length"]); let i = require("iconv-lite"); this.initGotEnv(t); const { url: o, ...h } = t; this.got[s](o, h).then((t => { const { statusCode: s, statusCode: o, headers: h, rawBody: r } = t, n = i.decode(r, this.encoding); e(null, { status: s, statusCode: o, headers: h, rawBody: r, body: n }, n) }), (t => { const { message: s, response: o } = t; e(s, o, o && i.decode(o.rawBody, this.encoding)) })) } http(t = {}) { let { method: e = "get", url: s, headers: i, body: o } = t, h = { url: s, headers: i }; return "post" === e && (h.body = o), new Promise((async t => { this[e](h, (async (e, s, i) => { try { e && (console.log(`${JSON.stringify(e)}`), console.log(`${this.name} API请求失败，请检查网路重试`)) } catch (t) { $.logThreadErr(t) } finally { t(i) } })) })) } envFormat(t) { if (this.cookie) { for (let t of this.envSplitor) if (this.cookie.indexOf(t) > -1) { this.splitor = t; break } return this.cookie.split(this.splitor).forEach((t => this.cookieArr.push(t))), !0 } console.log(`\n未填写变量${t}`) } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } queryStr(t) { let e = ""; for (const s in t) { let i = t[s]; null != i && "" !== i && ("object" == typeof i && (i = JSON.stringify(i)), e += `${s}=${i}&`) } return e = e.substring(0, e.length - 1), e } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logThread(...t) { (t = t.map((t => t ? t.startsWith("\n") ? `\n${this.logPrefix}${t.substring(1)}` : `${this.logPrefix}${t}` : t))).length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { this.log("", `❗️${this.name}, 错误!`, t.stack) } wait(t) { return new Promise((e => setTimeout(e, t))) } done(t = {}) { const e = ((new Date).getTime() - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${e} 秒`), this.log(), process.exit(1) } start() { this.log(`${this.name}, 开始!`) } end(t = {}) { const e = ((new Date).getTime() - this.startTime) / 1e3; this.log("", `${this.name}, 结束! 🕛 ${e} 秒`) } }(t, e) }