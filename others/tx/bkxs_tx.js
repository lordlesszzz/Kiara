
/*
必看小说TX

多账号@
export bkxshd = ""

cron: 0,59 9,10 * * *
*/
const $ = new Env('必看小说TX')
const crypto = require('crypto')
const { Worker, isMainThread, workerData } = require('worker_threads')

let cookie = ``
let cookieArr = [],
  envName = 'bkxshd',
  configName = 'bkxs',
  withdrawTime = '',
  withdrawNum = '',
  withdrawAmount = '',
  host = `api.ibreader.com`
withdrawTime = process.env.withdrawTime || '9:59:59.555'
withdrawNum = process.env.withdrawNum || '20'
withdrawAmount = process.env.withdrawAmount || '30'
cookie = cookie || process.env[envName]

!(async () => {
  if (isMainThread) {
    await checkEnv()
    if (cookieArr.length == 0) {
      if (!$.envFormat(envName)) return
    }
    // console.log(`\n共${cookieArr.length}个账号`)
    await withdrawInit()
    //线程数
    const threadCount = +process.env.threadCount || cookieArr.length
    const threads = new Set()
    console.log(`\n共${threadCount}个线程...`)

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
    // await userInfo()
    $.logPrefix = `【账号${$.index + 1}】${$.nickName || ''} `
    // $.log(`\n*******${$.logPrefix}******* `)
    await main()

  }


})().catch(err => {
  $.log(err)
}).finally(() => {
  // $.done()
})


// 主任务
async function main() {
  try {
    await withdrawTask()

    // await withdrawInfo()
    // $.log('\n------------------------', `【账号${$.index + 1}】${$.nickName || ''} 可提现豆余额：${$.canWithdrawDou}`, '------------------------')


  } catch (e) {
    console.log(e)

  }

}

async function withdrawTask() {
  try {
    // while (true) {
    //   try {
    //     await withdrawInfo()
    //     // $.logThread(`可提现豆子：${$.canWithdrawDou}`,`冻结豆子：${$.freezeDou}`,`当前最低提现豆子：${withdrawAmount * 100}`)

    //     if ($.canWithdrawDou >= withdrawAmount * 100) {
    //       let res = await withdraw($.canWithdrawDou)
    //       if (res?.includes('今天全站提现额度已用完')) break
    //     } else {
    //       break
    //     }
    //   } catch (e) {
    //     console.log(e)
    //   }
    // }
    $.withdraw = withdrawResolve(withdrawAmount)
    console.log(`\n当前时间: 🕛${$.time('HH:mm:ss.S')}, 开始...`)
    await Promise.all(new Array(~~withdrawNum).fill(0).map(() => withdraw($.withdraw)))
    console.log(`\n当前时间: 🕛${$.time('HH:mm:ss.S')}`)

  } catch (e) {
    console.log(e)
  }

}

async function withdrawInit() {
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
    method: 'get',
    ...taskUrl(`api/user/info`)
  })
  res = $.toObj(res)
  if (res.code == 1) {
    let { nickname, balance } = res.data
    $.nickName = nickname
    $.balance = balance

  }
}

async function withdrawInfo() {
  let res = await $.http({
    method: 'get',
    ...taskUrl(`api/account/withdraw/info`)
  })
  res = $.toObj(res)
  if (res.code == 1) {
    let { canWithdrawDou, freezeDou } = res.data
    $.canWithdrawDou = canWithdrawDou
    $.freezeDou = freezeDou

  }
}

async function withdraw(itemId) {
  let platform = 0
  let timestamp = Math.round(new Date().getTime() / 1000).toString()
  let sign = hashMD5(`7b7fpld4roey0e6e&itemId=${itemId}&platform=${platform}&time=${timestamp}`).toString()
  let res = await $.http({
    method: 'post',
    ...taskUrl(`task_api/task/v1/withdraw/submit`, {
      itemId,
      platform,
      sign,
      time: timestamp
    })
  })
  res = $.toObj(res)
  if (res.code == 100) {
    $.logThread(`\n提现${res.msg}成功`)
  } else {
    $.logThread(`\n${res.msg}`)
    return res.msg
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

function hashMD5(s) {
  return crypto.createHash('md5').update(String(s)).digest('hex').toUpperCase()
}

function withdrawResolve(withdrawAmount) {
  withdrawAmount = withdrawAmount + ''
  switch (withdrawAmount) {
    case '1':
      return 1
    case '5':
      return 2
    case '10':
      return 3
    case '30':
      return 4
    case '50':
      return 5
    case '100':
      return 6

  }
}

function taskUrl(path, body) {
  let opts = {
    url: `https://${host}/${path}`,
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      Cookie: `${cookie}`,
      'User-Agent': 'Mozilla / 5.0(iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit / 605.1.15(KHTML, like Gecko) Mobile / 15E148 MicroMessenger / 8.0.40(0x18002831) NetType / WIFI Language / zh_CN',
      'X-Client': 'sv=7.1.2;pm=PCAM00;ss=1080*2196;version=5.1.86.18.130500001;vId=60752445880d4366988c18aa9d9f6b80;signVersion=2;webVersion=new;oaid=null;pkv=1;ddid=DUzp43Y2YF9X-5bmS5YXSEZcB3nELTOxTV04RFV6cDQzWTJZRjlYLTVibVM1WVhTRVpjQjNuRUxUT3hUVjA0c2h1;androidosv=25;os=0;muk=ui98HJmkunswcEuBWDlg3A%3D%3D;firm=OPPO;duk=Bv6b4gAgfXcjaj%2BBwEtH32pUNNCFZYDKNOv%2Boplr96Q%3D;'
    },
  }
  if (body) opts.body = $.queryStr(body)
  return opts
}



// prettier-ignore
function Env(t, e) { return new class { constructor(t, e) { this.name = t, this.nickName = "", this.data = null, this.index = "", this.cookie = "", this.cookieArr = [], this.splitor = "@", this.envSplitor = ["@", "\n"], this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.logPrefix = `【账号${this.index}】${this.nickName || ""}`, this.encoding = "utf-8", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } loaddata() { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), o = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, o) : i ? this.fs.writeFileSync(e, o) : this.fs.writeFileSync(t, o) } } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"], delete t.headers["content-type"], delete t.headers["content-length"]); let s = require("iconv-lite"); this.initGotEnv(t), this.got(t).on("redirect", ((t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } })).then((t => { const { statusCode: i, statusCode: o, headers: h, rawBody: r } = t, n = s.decode(r, this.encoding); e(null, { status: i, statusCode: o, headers: h, rawBody: r, body: n }, n) }), (t => { const { message: i, response: o } = t; e(i, o, o && s.decode(o.rawBody, this.encoding)) })) } post(t, e = (() => { })) { const s = t.method ? t.method.toLocaleLowerCase() : "post"; t.body && t.headers && !t.headers["Content-Type"] && !t.headers["content-type"] && (t.headers["content-type"] = "application/x-www-form-urlencoded"), t.headers && (delete t.headers["Content-Length"], delete t.headers["content-length"]); let i = require("iconv-lite"); this.initGotEnv(t); const { url: o, ...h } = t; this.got[s](o, h).then((t => { const { statusCode: s, statusCode: o, headers: h, rawBody: r } = t, n = i.decode(r, this.encoding); e(null, { status: s, statusCode: o, headers: h, rawBody: r, body: n }, n) }), (t => { const { message: s, response: o } = t; e(s, o, o && i.decode(o.rawBody, this.encoding)) })) } http(t = {}) { let { method: e = "get", url: s, headers: i, body: o } = t, h = { url: s, headers: i }; return "post" === e && (h.body = o), new Promise((async t => { this[e](h, (async (e, s, i) => { try { e && (console.log(`${JSON.stringify(e)}`), console.log(`${this.name} API请求失败，请检查网路重试`)) } catch (t) { $.logErr(t) } finally { t(i) } })) })) } envFormat(t) { if (this.cookie) { for (let t of this.envSplitor) if (this.cookie.indexOf(t) > -1) { this.splitor = t; break } return this.cookie.split(this.splitor).forEach((t => this.cookieArr.push(t))), !0 } console.log(`\n未填写变量${t}`) } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } queryStr(t) { let e = ""; for (const s in t) { let i = t[s]; null != i && "" !== i && ("object" == typeof i && (i = JSON.stringify(i)), e += `${s}=${i}&`) } return e = e.substring(0, e.length - 1), e } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logThread(...t) { (t = t.map((t => t ? t.startsWith("\n") ? `\n${this.logPrefix}${t.substring(1)}` : `${this.logPrefix}${t}` : t))).length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { this.log("", `❗️${this.name}, 错误!`, t.stack) } wait(t) { return new Promise((e => setTimeout(e, t))) } done(t = {}) { const e = ((new Date).getTime() - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${e} 秒`), this.log(), process.exit(1) } start() { this.log(`${this.name}, 开始!`) } end(t = {}) { const e = ((new Date).getTime() - this.startTime) / 1e3; this.log("", `${this.name}, 结束! 🕛 ${e} 秒`) } }(t, e) }