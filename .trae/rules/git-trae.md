---
alwaysApply: false
description: "当创建分支、查看 diff、提交代码、合并代码或执行 Git 操作时触发"
---

# Git 操作纪律

## 分支

- 每个任务使用独立分支
- 分支命名格式：`<type>/<short-description>`
- 示例：`feat/batch-download`、`fix/login-expired`
- 禁止直接在 `main` 或 `master` 分支提交业务代码

## Diff

- 查看 diff 时使用非交互命令
- 推荐使用 `git --no-pager diff`
- 或使用 `git diff | cat`
- 禁止启动需要手动退出的 pager

## 提交前

- 提交前必须确认变更范围只包含当前任务
- 提交前必须查看 diff
- 合并前必须运行项目级验证命令
- 不得把密钥、token、临时文件、日志文件提交进仓库

## 危险操作

- `git push --force`
- `git rebase`
- `git reset --hard`
- 删除分支、删除 Git 历史或改写历史

以上操作必须先说明原因、影响范围和替代方案，等待用户确认后再执行。
