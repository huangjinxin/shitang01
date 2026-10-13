# 发布 / 上传到 GitHub

本项目通过 Git 推送到远程 GitHub 仓库。**账号、Token 等敏感信息不在本文件中**，仅保存在被忽略的本地文件 `.local/upload-notes.md`（见 `.gitignore` 的 `/.local/`）。

## 前置

```bash
cd "/Users/pinghu/Downloads/12345"
git status                 # 确认待提交内容
git remote -v              # 远程仓库地址（origin）
```

## 首次提交（已完成，供参考）

```bash
git init
git add -A
git commit -m "提交说明"
```

## 推送

- HTTPS 方式（推荐用 Token 作为密码，避免命令行明文）：

  ```bash
  git config credential.helper osxkeychain   # 让系统记住凭据
  git push -u origin main                     # 用户名填 GitHub 账号，密码填 Personal Access Token
  ```

- 或用环境变量 + 内联 helper（Token 不进入命令参数、不落盘）：

  ```bash
  export GH_TOKEN='<你的PAT>'
  git -c credential.helper='!f(){ printf "username=<账号>\npassword=%s\n" "$GH_TOKEN"; };f' push -u origin main
  unset GH_TOKEN
  ```

- SSH 方式：

  ```bash
  ssh-keygen -t ed25519 -C "<你的邮箱>"
  pbcopy < ~/.ssh/id_ed25519.pub     # 粘贴到 https://github.com/settings/keys
  git remote set-url origin git@github.com:<账号>/<仓库名>.git
  git push -u origin main
  ```

## 覆盖与冲突

- 远程为空：可直接 `git push -u origin main`。
- 远程已有提交：先 `git pull --rebase origin main` 再推送；**不要**用 `--force`，除非确认要覆盖历史。

## 安全约定

- 切勿把 `.env`、`.local/`、Token、账号密码提交或上传。
- 若 Token 曾在聊天/日志中出现，请到 https://github.com/settings/tokens 撤销并重新生成。
- 样例数据文件（`.xlsx/.docx/.doc`、`samples/`）含学校与食谱业务数据，上传至**公开**仓库前请确认可公开。

## 验证

```bash
git ls-remote origin       # 应出现 refs/heads/main
git log origin/main -1     # 与本地一致
```
