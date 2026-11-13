git fetch upstream                # 拉取上游更新
git merge --ff-only upstream/master   # 快进合并（有本地提交时改用 rebase）
git push origin master            # 同步回自己的 fork（可选）
