/*
鲸才招聘

-------------------  青龙-配置文件-复制区域  -------------------
# 鲸才招聘
export jczp=" 备注 # toekn # memberId  #  备注 # toekn # memberId   "

多账号用 换行 或 @ 分割
tg频道: https://t.me/yml2213_tg

const $ = new Env("鲸才招聘")
cron: 18 7,19 * * *
*/

const CodeName = "鲸才招聘"
const env = "jczp"
const envSplit = ["\n", "&", "@"]
const fs = require("fs")
const CryptoJS = require("crypto-js")
require("dotenv").config()
let sendLog = []
const mode = 1  // 并发-2   顺序-1
const runMax = 3  // 最大并发数量
const ckFile = `${env}.txt`
//====================================================================================================
const ck_ = ``

//====================================================================================================

class User {
  constructor(str, id) {
    this.index = id
    this.ckFlog = true
    this.ck_ = str.split("#")
    this.remark = this.ck_[0]
    this.token = this.ck_[1]
    this.memberId = this.ck_[2]

    this.key = '0603080708080808'
    this.iv = '0603080708080808'

  }

  async userTask() {
    await this.do_sign()  // 获取缓存的变量
    await this.info()  // 获取缓存的变量
    
    if (this.cashoutMoney >= 1) {
      await this.withdraw()
    }

  }

  // 100  19 1703727815953
  // https://op-api.cloud.jinhua.com.cn/api/welfare/cash/exchange
  async do_sign() {
    try {
      let ts13 = ts(13)
      let ivKey = await this.en_aes(ts13)
      let signIv = CryptoJS.MD5(`memberId=${this.memberId}&loginType=wx&token=${this.token}&ivKey=${ts13}`).toString()

      const options = {
        method: "post",
        url: `https://erp.5jingcai.com/signIn/signIn`,
        headers: {
          Host: 'erp.5jingcai.com',
          authorization: `Bearer ${this.token}`,
          charset: 'utf-8',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 12; M2102J2SC Build/SKQ1.211006.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 XWEB/1160027 MMWEBSDK/20230504 MMWEBID/1858 MicroMessenger/8.0.37.2380(0x2800255B) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64 MiniProgramEnv/android',
          'content-type': 'application/json',
          Referer: 'https://servicewechat.com/wxb848fb987b3393a8/336/page-frame.html'
        },
        json: {
          loginFrom: 'wx',
          memberId: `${this.memberId}`,
          token: this.token,
          loginType: 'wx',
          fromType: '',
          flag: 'weixin',
          ivKey: ivKey,
          signIv: signIv,
          sendFlag: '0'
        },
      }
      // console.log(options)
      let { res } = await requestPromise(options)
      // console.log(res)
      if (res.code === '0') {
        this.log(`签到成功: 获得 ${res.data} 金币`)
        await wait(3, 5)
      } else if (res.code === "2") {
        this.log(`签到: ${res.msg}`)
      } else {
        this.log(res)
      }
    } catch (error) {
      console.log(error)
    }
  }

  // https://erp.5jingcai.com/signIn/getRewardIndexInfo
  async info() {
    try {
      let ts13 = ts(13)
      let ivKey = await this.en_aes(ts13)
      let signIv = CryptoJS.MD5(`memberId=${this.memberId}&loginType=wx&token=${this.token}&ivKey=${ts13}`).toString()

      const options = {
        method: "post",
        url: `https://erp.5jingcai.com/signIn/getRewardIndexInfo`,
        headers: {
          Host: 'erp.5jingcai.com',
          authorization: `Bearer ${this.token}`,
          charset: 'utf-8',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 12; M2102J2SC Build/SKQ1.211006.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 XWEB/1160027 MMWEBSDK/20230504 MMWEBID/1858 MicroMessenger/8.0.37.2380(0x2800255B) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64 MiniProgramEnv/android',
          'content-type': 'application/json',
          Referer: 'https://servicewechat.com/wxb848fb987b3393a8/336/page-frame.html'
        },
        json: {
          loginFrom: 'wx',
          memberId: `${this.memberId}`,
          token: this.token,
          loginType: 'wx',
          fromType: '',
          flag: 'weixin',
          sendFlag: '0',
          "fromFlag": "signIn"
        },
      }
      // console.log(options)
      let { res } = await requestPromise(options)
      // console.log(res)
      if (res.code === '0') {
        this.cashoutMoney = res.data.info.cashoutMoney
        this.log(`可提现: ${res.data.info.cashoutMoney} 元, 现有: ${res.data.info.freezeMoney} 元`)
      } else {
        this.log(res)
      }
    } catch (error) {
      console.log(error)
    }
  }

  async withdraw(money = 1) {
    try {
      let ts13 = ts(13)
      let ivKey = await this.en_aes(ts13)
      let signIv = CryptoJS.MD5(`memberId=${this.memberId}&loginType=wx&token=${this.token}&ivKey=${ts13}`).toString()

      const options = {
        method: "post",
        url: `https://erp.5jingcai.com/signIn/signInCashOutMoney`,
        headers: {
          Host: 'erp.5jingcai.com',
          authorization: `Bearer ${this.token}`,
          charset: 'utf-8',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 12; M2102J2SC Build/SKQ1.211006.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 XWEB/1160027 MMWEBSDK/20230504 MMWEBID/1858 MicroMessenger/8.0.37.2380(0x2800255B) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64 MiniProgramEnv/android',
          'content-type': 'application/json',
          Referer: 'https://servicewechat.com/wxb848fb987b3393a8/336/page-frame.html'
        },
        json: {
          loginFrom: 'wx',
          memberId: `${this.memberId}`,
          token: this.token,
          loginType: 'wx',
          fromType: '',
          flag: 'weixin',
          ivKey: ivKey,
          signIv: signIv,
          sendFlag: '0',
          cashoutMoney: money * 100
        },
      }
      // console.log(options)
      let { res } = await requestPromise(options)
      // console.log(res)
      if (res.code === '0') {
        this.log(`提现${money}元成功`)
      } else {
        this.log(res)
      }
    } catch (error) {
      console.log(error)
    }
  }

  // ECC9809F77B6175A6C26BD0FD72FC8BA
  // 717e27201dc7e5d504d156436aa6519f
  async en_aes(word) {
    let key = this.key
    let iv = this.iv
    key = CryptoJS.enc.Utf8.parse(key)
    iv = CryptoJS.enc.Utf8.parse(iv)
    let srcs = CryptoJS.enc.Utf8.parse(word)
    // 加密模式为CBC，补码方式为PKCS5Padding（也就是PKCS7）
    let encrypted = CryptoJS.AES.encrypt(srcs, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })
    //返回base64
    // return CryptoJS.enc.Base64.stringify(encrypted.ciphertext)
    return encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase()

  }


  log(message, p = 0) {
    if (mode === 1 && !this.hasLogged) {
      console.log(`\n${"•".repeat(24)}  ${this.index} ${"•".repeat(24)}\n`)
      this.hasLogged = true
    }
    console.log(`${this.index}-${this.remark},  ${typeof message === "object" ? JSON.stringify(message) : message}`)
    if (p) {
      sendLog.push(`${this.index} ${message}`)
    }
  }
}


async function requestPromise(options) {
  const got = require("got")
  let response, body, headers, res
  try {
    if (options.method.toUpperCase() === "GET") delete options.json, options.body, options.from
    if (options.params) {
      options.searchParams = options.params
      delete options.params
    }
    response = await got(options, {
      followRedirect: false,
      https: { rejectUnauthorized: false },
      timeout: 13000,
    })
  } catch (error) {
    response = error.response
    console.log(error)
  }
  if (response) {
    body = response.body
    headers = response.headers
    if (body) {
      try {
        res = JSON.parse(body)
      } catch (e) {
        res = body
      }
    }
  }
  return { headers, res }
}

class UserList {
  constructor(env) {
    this.env = env
    this.userList = []
    this.logPrefix = `\n[环境检测 ${this.env}]`
    this.mode = mode
  }


  checkEnv() {
    try {
      let UserData = ""
      if (ckFile !== "" && fs.existsSync(ckFile)) {
        UserData = UserData.concat(fs.readFileSync(`./${ckFile}`, "utf-8").split("\n") || [])
        console.log(`ck文件[ ${ckFile} ]加载成功`)
      } else {
        console.log(`ck文件[ ${ckFile} ]不存在, 调用青龙环境变量`)
        UserData = process.env[env] || ck_
      }
      if (!UserData || UserData.trim() === "") {
        console.log(`${this.logPrefix} 没有找到账号信息`)
        return false
      }
      this.userList = UserData
        .split(new RegExp(envSplit.join("|")))
        .filter((cookie) => cookie.trim() !== "")
        .map((cookie, index) => new User(cookie.trim(), `账号[${index + 1}]`))
      const userCount = this.userList.length
      console.log(`${this.logPrefix} ${userCount > 0 ? `找到 ${userCount} 个账号\n` : "没有找到账号\n"}`)
      return true

    } catch (e) {
      console.log(e)
    }
  }

  async runTask() {
    if (!this.checkEnv()) {
      return
    }
    console.log(`[任务 ${CodeName}] 开始运行`)
    if (this.mode === 2) {  // 并发
      const taskQueue = []
      const concurrency = runMax
      for (const user of this.userList) {
        while (taskQueue.length >= concurrency) {
          await Promise.race(taskQueue)
        }
        const promise = user.userTask()
        taskQueue.push(promise)
        promise.finally(() => {
          taskQueue.splice(taskQueue.indexOf(promise), 1)
        })
        if (taskQueue.length < concurrency) {
          continue
        }
        await Promise.race(taskQueue)
      }
      await Promise.allSettled(taskQueue)
    } else {
      for (const user of this.userList) {
        await user.userTask()
      }
    }
  }
}

(async () => {
  const s = Date.now()
  const userList = new UserList(env)
  await userList.runTask()
  const e = Date.now()
  await done(s, e)
})().catch(console.error)


async function done(s, e) {
  const el = (e - s) / 1000
  console.log(`\n[任务执行完毕 ${CodeName}] 耗时：${el.toFixed(2)}秒`)
  await showmsg()

  async function showmsg() {
    if (!sendLog) return
    if (!sendLog.length) return
    let notify = require('./sendNotify')
    console.log('\n============== 本次推送--by_yml ==============')
    await notify.sendNotify(CodeName, sendLog.join('\n'))
  }

  process.exit(0)

}

function wait(min = 2, max = 3) {  //默认等待 2-3 秒， 自定义的话需要两个值
  let s = Math.round(Math.random() * (max - min) + min)
  console.log(`等待 ${s} 秒`)
  return new Promise((resolve) => setTimeout(resolve, s * 1000))
}

function ts(type = false, _data = "") {
  let myDate = new Date()
  let a = ""
  switch (type) {
    case 10:
      a = Math.round(new Date().getTime() / 1000).toString()
      break
    case 13:
      a = Math.round(new Date().getTime()).toString()
      break
    case "h":
      a = myDate.getHours()
      break
    case "m":
      a = myDate.getMinutes()
      break
    case "y":
      a = myDate.getFullYear()
      break
    case "h":
      a = myDate.getHours()
      break
    case "mo":
      a = myDate.getMonth() + 1
      break
    case "d":
      a = myDate.getDate()
      break
    case "ts2Data":
      if (_data != "") {
        time = _data
        if (time.toString().length == 13) {
          let date = new Date(time + 8 * 3600 * 1000)
          a = date.toJSON().substr(0, 19).replace("T", " ")
        } else if (time.toString().length == 10) {
          time = time * 1000
          let date = new Date(time + 8 * 3600 * 1000)
          a = date.toJSON().substr(0, 19).replace("T", " ")
        }
      }
      break
    default:
      a = "未知错误,请检查"
      break
  }
  return a
}