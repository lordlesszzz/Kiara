# export JD_LOG_XYZ_TOKEN="从机器人获取的token"
# export Proxy_Url="代理网址 例如：星空、熊猫 生成选择txt 一次一个"
# export WABAO_SUSSCESS_COUNT="111" #挖宝助力次数限制，助力111次
# 需要`wabaolist.txt`，存放需要助力的URL,一行一个
# 在青龙里新建一个定时任务，名称、定时规则随意，命令：task /ql/scripts/a_wabao.sh
chmod +x BBK
./BBK -t wabao
