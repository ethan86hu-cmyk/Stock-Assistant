# 部署到服务器

和 contract-scan-ai 同一台服务器、同样的方式：nginx 在前面转发，Warm Plate 作为 systemd 服务常驻运行，推送到 `main` 后由 GitHub Actions 自动更新。

下面用 `warm.example.com` 代表你的域名，用 `/opt/warm-plate` 作为程序目录。

## 选域名前先确认

- 服务器在中国大陆，网站要能访问，域名**必须已经 ICP 备案**
- **最省事**：用 contract-scan-ai 那个已备案域名的**子域名**（比如 `warm.你的域名`），不需要重新备案，只要在 DNS 里加一条 A 记录指向服务器 IP
- 用全新域名，要先完成备案（一般 1–3 周）
- 目标用户在海外，访问国内服务器会慢一些。验证阶段够用；正式上线建议换海外服务器，也就不需要备案了

## 第一次部署（在服务器上操作一次）

以下命令都在服务器上执行。

### 1. 安装 Node.js 22

```bash
node -v   # 已有 v20.12 以上可跳过
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -   # CentOS / Alibaba Cloud Linux
sudo yum install -y nodejs
# Ubuntu / Debian 用：curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt-get install -y nodejs
which node   # 应为 /usr/bin/node；不是的话，改 warm-plate.service 里的 ExecStart
```

### 2. 创建运行用户和目录

```bash
sudo useradd --system --no-create-home --shell /sbin/nologin warmplate
sudo mkdir -p /opt/warm-plate/data
sudo chown warmplate:warmplate /opt/warm-plate/data   # 等待名单写在这里
```

### 3. 放入代码

在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 添加以下密钥（前三个和 contract-scan-ai 仓库里的值相同，需要重新填一遍，GitHub 的密钥不能跨仓库共享）：

| 名称 | 值 |
|---|---|
| `SERVER_HOST` | 服务器 IP |
| `SERVER_USER` | SSH 用户（contract-scan-ai 用的是 `root`） |
| `SERVER_SSH_KEY` | SSH 私钥 |
| `WARM_PLATE_PATH` | `/opt/warm-plate` |

然后把代码合并到 `main` 分支，Actions 会自动上传并安装依赖。第一次运行到"重启"这一步会失败，因为服务还没创建，这是正常的。继续下面的步骤。

### 4. 配置 .env

```bash
cd /opt/warm-plate
sudo cp .env.example .env
sudo vi .env          # 填 DEEPSEEK_API_KEY 等
sudo chown root:warmplate .env && sudo chmod 640 .env
```

### 5. 安装并启动服务

```bash
sudo cp /opt/warm-plate/deploy/warm-plate.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now warm-plate
sudo systemctl status warm-plate     # 应显示 active (running)
curl -s http://127.0.0.1:3100/api/config | head -c 200
```

### 6. 配置 nginx 和 HTTPS

1. DNS 里给 `warm.你的域名` 加一条 A 记录，指向服务器 IP
2. 申请证书：阿里云控制台"数字证书管理服务"有免费证书，下载 nginx 格式，放到 `/etc/nginx/ssl/`
3. 安装站点配置：

```bash
sudo cp /opt/warm-plate/deploy/nginx-warm-plate.conf /etc/nginx/conf.d/warm-plate.conf
sudo vi /etc/nginx/conf.d/warm-plate.conf   # 把 warm.example.com 和证书路径改成你的
sudo nginx -t && sudo systemctl reload nginx
```

4. 阿里云安全组确认已放行 80 和 443 端口（contract-scan-ai 在用，通常已经放行）

打开 `https://warm.你的域名` 验证。

## 以后更新

合并到 `main` 就会自动部署：先跑测试，测试通过才上传并重启。也可以在 GitHub 的 Actions 页面手动运行 "Deploy Warm Plate"。

服务器上的 `.env` 和 `data/` 不会被覆盖。

## 常用命令

```bash
sudo journalctl -u warm-plate -f            # 看日志（识别接口的报错也在这里）
sudo systemctl restart warm-plate           # 改完 .env 后重启
wc -l /opt/warm-plate/data/waitlist.jsonl   # 等待名单人数
cat /opt/warm-plate/data/waitlist.jsonl     # 导出名单
```

## 统计每条视频带来的报名

分享链接时加上 `?ref=`，比如 `https://warm.你的域名/?ref=tiktok1`。报名记录里的 `source` 字段就会是 `tiktok1`，可以看出哪条视频效果最好：

```bash
grep -o '"source":"[^"]*"' /opt/warm-plate/data/waitlist.jsonl | sort | uniq -c
```
