"""

time：2023.9.13
cron: 12 0,8,12,14,16,18,10 * * *
new Env('美团小团币');
抓包小程序或者app或者网页的token=xxxxxx  只要token后面的值
环境变量: mttoken = xxxxxx
多账号新建变量或者用 & 分开

"""
import random
from functools import partial
import os, requests, time, base64, random, string
from user_agent import generate_user_agent


class Mttb:
    def __init__(self, ck):
        self.ck = ck
        self.name = None
        self.name = None
        self.usid = None
        self.actoken = None
        self.xtb = None
        self.wcxtb = None
        self.ids = []
        self.ids1 = []
        self.id = None
        self.tid = None
        self.ua = generate_user_agent(os='android')
        self.t_h = None

    def main(self):
        if self.login():
            self.act()
            self.cxtb()
            if self.get_ids():
                self.get_id()

    def login(self):
        try:
            url = "https://open.meituan.com/user/v1/info/auditting?fields=auditAvatarUrl%2CauditUsername"
            h = {
                'Connection': 'keep-alive',
                'Origin': 'https://mtaccount.meituan.com',
                'User-Agent': self.ua,
                'token': self.ck,
                'Referer': 'https://mtaccount.meituan.com/user/',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'zh-CN,en-US;q=0.9',
                'X-Requested-With': 'com.sankuai.meituan',
            }
            r = requests.get(url, headers=h)

            if 'username' in r.text:
                rj = r.json()
                self.name = rj["user"]["username"]
                self.usid = rj["user"]["id"]
                xx = f'{self.name}>>>登录成功！'
                print(xx)
                return True
            else:
                print(r.json())
        except Exception as e:
            print(f'登录异常：{e}')
            exit(0)

    def act(self):
        try:
            url = 'https://game.meituan.com/mgc/gamecenter/front/api/v1/login'
            h = {
                'Accept': 'application/json, text/plain, */*',
                'Content-Length': '307',
                'x-requested-with': 'XMLHttpRequest',
                'User-Agent': self.ua,
                'Content-Type': 'application/json;charset=UTF-8',
                'cookie': f'token={self.ck}'
            }
            sing = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
            data = {
                "mtToken": self.ck,
                "deviceUUID": '0000000000000A3467823460D436CAB51202F336236F6A167191373531985811',
                "mtUserId": self.usid,
                "idempotentString": sing
            }
            r = requests.post(url, headers=h, json=data)
            if r.json()['data']['loginInfo']['accessToken'] is not None:
                self.actoken = r.json()['data']['loginInfo']['accessToken']
                # print(f'{self.name}>>>获取token成功！')
            else:
                print(r.json())
        except Exception as e:
            print(f'获取token异常：{e}')
            exit(0)

    def cxtb(self):
        try:
            url = 'https://game.meituan.com/mgc/gamecenter/skuExchange/resource/counts?sceneId=3&gameId=10102'
            self.t_h = {
                'Accept': 'application/json, text/plain, */*',
                'x-requested-with': 'XMLHttpRequest',
                'User-Agent': self.ua,
                'Content-Type': 'application/json;charset=UTF-8',
                'mtgsig': '',
                'actoken': self.actoken,
                'mtoken': self.ck,
                'cookie': f'token={self.ck}'
            }
            r = requests.get(url, headers=self.t_h)
            rj = r.json()
            if rj['msg'] == 'ok':
                data = rj['data']
                for d in data:
                    if self.xtb is not None:
                        self.wcxtb = d['count']
                        xx = f'{self.name}>>>当前小团币: {self.wcxtb}'
                        print(xx)
                    else:
                        self.xtb = d['count']
                        xx = f'{self.name}>>>小团币: {self.xtb}'
                        print(xx)
        except Exception as e:
            print(f'查询团币异常：{e}')
            exit(0)

    def get_ids(self):
        try:
            url = 'https://game.meituan.com/mgc/gamecenter/front/api/v1/mgcUser/task/queryMgcTaskInfo'
            data = {
                "externalStr": "",
                "riskParams": {}
            }
            r = requests.post(url, headers=self.t_h, json=data)
            rj = r.json()
            print(rj)
            if rj['msg'] == 'ok':
                data_list = r.json()['data']['taskList']
                for i in data_list:
                    self.ids.append(i['id'])
                if self.ids:
                    random.shuffle(self.ids)
                    print(self.ids)
                    print(f'{self.name}>>>获取到{len(self.ids)}任务！\n')
                    return True

            else:
                print(f'{self.name}>>>获取任务失败！')
        except Exception as e:
            print(f'获取任务异常：{e}')
            exit(0)

    def get_id(self):
        for i in self.ids:
            self.id = i
            if self.get_game():
                self.post_id()
        print(f'{self.name}>>>全部任务完成！')
        self.cxtb()
        print(f'{self.name}>>>本次运行获取小团币: {int(self.wcxtb) - int(self.xtb)}')

    def b64(self):
        y_bytes = base64.b64encode(self.tid.encode('utf-8'))
        y_bytes = y_bytes.decode('utf-8')
        return y_bytes

    def get_game(self):
        try:
            self.tid = f'mgc-gamecenter{self.id}'
            self.tid = self.b64()
            url = f'https://game.meituan.com/mgc/gamecenter/common/mtUser/mgcUser/task/finishV2?taskId={self.tid}'
            r = requests.get(url, headers=self.t_h)
            # print(r.json())
            if r.status_code == 200:
                if r.json()['msg'] == 'ok':
                    print(f'{self.name}>>>{self.id} 领取任务成功！')
                    time.sleep(5)
                    return True
                elif '完成过' in r.text:
                    print(f'{self.name}>>>{self.id} 完成过领取任务成功！')
                    time.sleep(5)
                    return True
                else:
                    print(f'🌚任务状态: {r.text}')
            else:
                print('请求错误: ', r.status_code)
        except Exception as e:
            print(f'获取任务异常：{e}')
            exit(0)

    def post_id(self):
        try:
            url = 'https://game.meituan.com/mgc/gamecenter/front/api/v1/mgcUser/task/receiveMgcTaskReward?yodaReady=h5&csecplatform=4&csecversion=2.1.0&mtgsig={}'
            data = {
                "taskId": self.id,
                "externalStr": "",
                "riskParams": {}
            }
            r = requests.post(url, headers=self.t_h, json=data)
            # print(r.json())
            if r.status_code == 200:
                if r.json()['msg'] == 'ok':
                    print(f'{self.name}>>>{self.id},完成任务！\n')
                    time.sleep(5)
                elif '异常' in r.text:
                    print(f'{self.name}>>>{self.id},状态异常，任务不可领奖！\n')
                    time.sleep(5)
                else:
                    print(f'{self.name}>>>{self.id},{r.text}\n')
                    time.sleep(5)
            else:
                print('请求错误!')
        except Exception as e:
            print(f'完成任务异常：{e}')
            exit(0)


if __name__ == '__main__':
    print = partial(print, flush=True)
    token = os.environ.get("meituanCookie")

    if '\n' in token:
        tokens = token.split('\n')
    else:
        tokens = [token]

    print(f'获取到{len(tokens)}个账号')

    for token in tokens:
        run = Mttb(token)
        run.main()
        print()
