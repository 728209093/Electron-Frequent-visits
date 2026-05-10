import { Page } from 'playwright'
import { BehaviorConfig, PopupRule } from '../../shared/types'

/**
 * 浏览器行为模拟器 (Playwright 版本)
 */
export class BehaviorSimulator {
  private page: Page
  private config: BehaviorConfig

  constructor(page: Page, config: BehaviorConfig) {
    this.page = page
    this.config = config
  }

  /**
   * 执行所有行为模拟（不包含弹窗处理，弹窗由油猴脚本负责）
   */
  async simulate(): Promise<void> {
    const behaviors: (() => Promise<void>)[] = []

    // 1. 页面停留
    behaviors.push(() => this.stayOnPage())

    // 2. 鼠标移动
    if (this.config.mouseMove?.enabled) {
      behaviors.push(() => this.simulateMouseMove())
    }

    // 3. 滚动
    if (this.config.scroll?.enabled) {
      behaviors.push(() => this.simulateScroll())
    }

    // 4. 点击
    if (this.config.click?.enabled && this.config.click.selectors?.length > 0) {
      behaviors.push(() => this.simulateClick())
    }

    // 5. 输入
    if (this.config.input?.enabled && this.config.input.selectors?.length > 0) {
      behaviors.push(() => this.simulateInput())
    }

    // 随机或顺序执行
    const list = this.config.randomOrder ? this.shuffleArray(behaviors) : behaviors
    for (const fn of list) {
      await fn()
    }
  }

  /**
   * 处理所有弹窗规则
   */
  async handlePopups(): Promise<void> {
    const popupConfig = this.config.popup
    if (!popupConfig) return

    console.log(`[Behavior] Handling popups, rules: ${popupConfig.rules.length}`)

    const sortedRules = [...popupConfig.rules].sort((a, b) => a.priority - b.priority)

    for (const rule of sortedRules) {
      try {
        const handled = await this.handleSinglePopup(rule)
        if (handled) {
          const delay = this.randomBetween(
            popupConfig.afterClickDelay[0],
            popupConfig.afterClickDelay[1]
          )
          await this.delay(delay)
        }
      } catch (error) {
        console.error(`[Behavior] Error handling popup "${rule.name}":`, error)
        if (rule.required) throw error
      }
    }
  }

  /**
   * 处理单个弹窗 - 移植油猴脚本逻辑
   */
  private async handleSinglePopup(rule: PopupRule): Promise<boolean> {
    console.log(`[Behavior] Checking popup: ${rule.name}`)

    // 等待 Vue/React 渲染完成
    await this.delay(1500)

    const selectors = rule.buttonSelectors || []
    const texts = rule.buttonTexts || []

    // 先打印页面当前状态，帮助诊断
    const pageInfo = await this.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      return {
        url: window.location.href,
        buttonCount: btns.length,
        buttons: btns.slice(0, 10).map(b => ({
          class: b.className,
          text: (b.innerText || '').trim().substring(0, 30),
          visible: b.getBoundingClientRect().width > 0,
        })),
        answerBtns: Array.from(document.querySelectorAll('button.answer-btn-yes-inline')).length,
      }
    })
    console.log(`[Behavior] Page info:`, JSON.stringify(pageInfo))

    // 注入油猴同款轮询逻辑，最多轮询 15 秒
    const clicked = await this.page.evaluate(
      ({ selectors, texts }) => {
        return new Promise<boolean>((resolve) => {
          let done = false
          let attempts = 0
          const maxAttempts = 30 // 每500ms一次，最多15秒

          function clickReal(btn: HTMLElement) {
            const rect = btn.getBoundingClientRect()
            const x = rect.left + rect.width / 2
            const y = rect.top + rect.height / 2
            ;['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(type => {
              btn.dispatchEvent(new MouseEvent(type, {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: x,
                clientY: y,
              }))
            })
            btn.click()
            console.log(`[Inject] Clicked button: ${btn.className} text="${btn.innerText?.trim()}"`)
          }

          const timer = setInterval(() => {
            if (done || attempts >= maxAttempts) {
              clearInterval(timer)
              resolve(done)
              return
            }
            attempts++
            console.log(`[Inject] Attempt ${attempts}/${maxAttempts}`)

            // 1. CSS 选择器 + 文本过滤
            for (const sel of selectors) {
              try {
                const btns = Array.from(document.querySelectorAll(sel)) as HTMLElement[]
                const targets = texts.length > 0
                  ? btns.filter(b => texts.includes((b.innerText || '').trim()))
                  : btns.filter(b => b.getBoundingClientRect().width > 0)

                if (targets.length > 0) {
                  clickReal(targets[targets.length - 1])
                  done = true
                  clearInterval(timer)
                  resolve(true)
                  return
                }
              } catch (e) {
                console.log(`[Inject] Selector error: ${e}`)
              }
            }

            // 2. 纯文本匹配兜底
            for (const text of texts) {
              const all = Array.from(document.querySelectorAll('button, a, span, div')) as HTMLElement[]
              const match = all.find(el => (el.innerText || el.textContent || '').trim() === text)
              if (match && match.getBoundingClientRect().width > 0) {
                clickReal(match)
                done = true
                clearInterval(timer)
                resolve(true)
                return
              }
            }
          }, 500)
        })
      },
      { selectors, texts }
    )

    if (clicked) {
      console.log(`[Behavior] ✅ Popup clicked: ${rule.name}`)
    } else {
      console.log(`[Behavior] ❌ Popup not found after 15s: ${rule.name}`)
    }

    return clicked
  }

  // ─── 页面停留 ───────────────────────────────────────────
  private async stayOnPage(): Promise<void> {
    const [min, max] = this.config.stayDuration
    const duration = this.randomBetween(min, max)
    console.log(`[Behavior] Staying ${duration}ms`)
    await this.delay(duration)
  }

  // ─── 滚动 ────────────────────────────────────────────────
  private async simulateScroll(): Promise<void> {
    const sc = this.config.scroll
    if (!sc) return

    const count = this.randomBetween(sc.scrollCount[0], sc.scrollCount[1])
    console.log(`[Behavior] Scrolling ${count} times`)

    for (let i = 0; i < count; i++) {
      const distance = this.randomBetween(sc.scrollDistance[0], sc.scrollDistance[1])
      const interval = this.randomBetween(sc.scrollInterval[0], sc.scrollInterval[1])

      let delta = distance
      if (sc.direction === 'up') delta = -distance
      else if (sc.direction === 'both') delta = Math.random() > 0.5 ? distance : -distance

      // Playwright 平滑滚动
      await this.page.mouse.wheel(0, delta)

      if (sc.pauseAtBottom && delta > 0) {
        const atBottom = await this.page.evaluate(
          () => window.innerHeight + window.scrollY >= document.body.scrollHeight - 100
        )
        if (atBottom) {
          const pause = this.randomBetween(sc.bottomPauseDuration[0], sc.bottomPauseDuration[1])
          await this.delay(pause)
        }
      }

      await this.delay(interval)
    }
  }

  // ─── 鼠标移动 ────────────────────────────────────────────
  private async simulateMouseMove(): Promise<void> {
    const mc = this.config.mouseMove
    if (!mc) return

    const points = this.randomBetween(mc.movePoints[0], mc.movePoints[1])
    const vp = this.page.viewportSize() || { width: 1920, height: 1080 }

    console.log(`[Behavior] Mouse move ${points} points`)

    let x = this.randomBetween(100, vp.width - 100)
    let y = this.randomBetween(100, vp.height - 100)

    for (let i = 0; i < points; i++) {
      const tx = this.randomBetween(50, vp.width - 50)
      const ty = this.randomBetween(50, vp.height - 50)
      const steps = this.randomBetween(5, 15)

      // 贝塞尔曲线插值
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        const cx = x + (tx - x) * ease + (mc.randomCurve ? this.randomBetween(-8, 8) : 0)
        const cy = y + (ty - y) * ease + (mc.randomCurve ? this.randomBetween(-8, 8) : 0)
        await this.page.mouse.move(cx, cy)
        await this.delay(this.randomBetween(mc.moveSpeed[0], mc.moveSpeed[1]))
      }

      x = tx
      y = ty
    }
  }

  // ─── 点击 ────────────────────────────────────────────────
  private async simulateClick(): Promise<void> {
    const cc = this.config.click
    if (!cc) return

    let clicks = 0
    for (const selector of cc.selectors) {
      if (clicks >= cc.maxClicks) break
      if (Math.random() > cc.clickProbability) continue

      try {
        const locator = this.page.locator(selector).first()
        await locator.waitFor({ state: 'visible', timeout: 3000 })

        if (cc.moveBeforeClick) {
          const box = await locator.boundingBox()
          if (box) {
            await this.page.mouse.move(
              box.x + box.width / 2 + this.randomBetween(-5, 5),
              box.y + box.height / 2 + this.randomBetween(-5, 5)
            )
            await this.delay(this.randomBetween(100, 300))
          }
        }

        await locator.click()
        clicks++
        console.log(`[Behavior] Clicked: ${selector}`)
        await this.delay(this.randomBetween(500, 1500))
      } catch {
        // 元素不存在，跳过
      }
    }
  }

  // ─── 输入 ────────────────────────────────────────────────
  private async simulateInput(): Promise<void> {
    const ic = this.config.input
    if (!ic || !ic.presetTexts.length) return

    for (const selector of ic.selectors) {
      if (Math.random() > ic.inputProbability) continue

      try {
        const locator = this.page.locator(selector).first()
        await locator.waitFor({ state: 'visible', timeout: 3000 })
        await locator.click()
        await locator.fill('')

        const text = ic.presetTexts[Math.floor(Math.random() * ic.presetTexts.length)]
        for (const char of text) {
          await this.page.keyboard.type(char)
          await this.delay(this.randomBetween(ic.typingSpeed[0], ic.typingSpeed[1]))
        }

        console.log(`[Behavior] Input done: ${selector}`)
        await this.delay(this.randomBetween(300, 800))
      } catch {
        // 跳过
      }
    }
  }

  // ─── 工具方法 ────────────────────────────────────────────
  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
}
