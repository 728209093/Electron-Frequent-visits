import { ElementHandle, Page } from 'puppeteer'
import { BehaviorConfig, PopupRule } from '../../shared/types'

export class BehaviorSimulator {
  private readonly page: Page
  private readonly config: BehaviorConfig
  private readonly onLog?: (message: string, type: 'info' | 'success' | 'error' | 'action') => void

  constructor(
    page: Page,
    config: BehaviorConfig,
    onLog?: (message: string, type: 'info' | 'success' | 'error' | 'action') => void
  ) {
    this.page = page
    this.config = config
    this.onLog = onLog
  }

  async simulate(): Promise<void> {
    const behaviors: Array<() => Promise<void>> = []

    behaviors.push(() => this.stayOnPage())

    if (this.config.mouseMove?.enabled) {
      behaviors.push(() => this.simulateMouseMove())
    }

    if (this.config.scroll?.enabled) {
      behaviors.push(() => this.simulateScroll())
    }

    if (this.config.click?.enabled && this.config.click.selectors?.length > 0) {
      behaviors.push(() => this.simulateClick())
    }

    if (this.config.input?.enabled && this.config.input.selectors?.length > 0) {
      behaviors.push(() => this.simulateInput())
    }

    const runList = this.config.randomOrder ? this.shuffleArray(behaviors) : behaviors
    for (const behavior of runList) {
      await behavior()
    }
  }

  async handlePopups(): Promise<void> {
    const popupConfig = this.config.popup
    if (!popupConfig) {
      return
    }

    this.log(`开始处理弹窗规则，共 ${popupConfig.rules.length} 条`, 'info')

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
        if (rule.required) {
          throw error
        }
      }
    }
  }

  private async handleSinglePopup(rule: PopupRule): Promise<boolean> {
    this.log(`检查弹窗规则: ${rule.name}`, 'info')
    await this.delay(1500)

    const selectors = rule.buttonSelectors || []
    const texts = rule.buttonTexts || []

    const clicked = await this.page.evaluate(
      ({ selectors, texts }) => {
        return new Promise<boolean>((resolve) => {
          let done = false
          let attempts = 0
          const maxAttempts = 30

          const clickReal = (element: HTMLElement) => {
            const rect = element.getBoundingClientRect()
            const x = rect.left + rect.width / 2
            const y = rect.top + rect.height / 2

            ;['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach((eventType) => {
              element.dispatchEvent(new MouseEvent(eventType, {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: x,
                clientY: y,
              }))
            })

            element.click()
          }

          const timer = window.setInterval(() => {
            if (done || attempts >= maxAttempts) {
              window.clearInterval(timer)
              resolve(done)
              return
            }

            attempts += 1

            for (const selector of selectors) {
              try {
                const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[]
                const targets = texts.length > 0
                  ? elements.filter((element) => texts.includes((element.innerText || '').trim()))
                  : elements.filter((element) => element.getBoundingClientRect().width > 0)

                if (targets.length > 0) {
                  clickReal(targets[targets.length - 1])
                  done = true
                  window.clearInterval(timer)
                  resolve(true)
                  return
                }
              } catch {
                // Ignore invalid selectors.
              }
            }

            for (const text of texts) {
              const elements = Array.from(document.querySelectorAll('button, a, span, div')) as HTMLElement[]
              const match = elements.find(
                (element) => (element.innerText || element.textContent || '').trim() === text
              )

              if (match && match.getBoundingClientRect().width > 0) {
                clickReal(match)
                done = true
                window.clearInterval(timer)
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
      this.log(`已处理弹窗: ${rule.name}`, 'success')
    } else {
      this.log(`未找到弹窗: ${rule.name}`, 'error')
    }

    return clicked
  }

  private async stayOnPage(): Promise<void> {
    const [min, max] = this.config.stayDuration
    const duration = this.randomBetween(min, max)
    this.log(`页面停留 ${duration}ms`, 'action')
    await this.delay(duration)
  }

  private async simulateScroll(): Promise<void> {
    const scrollConfig = this.config.scroll
    if (!scrollConfig) {
      return
    }

    const count = this.randomBetween(scrollConfig.scrollCount[0], scrollConfig.scrollCount[1])
    this.log(`执行滚动 ${count} 次`, 'action')

    for (let index = 0; index < count; index += 1) {
      const distance = this.randomBetween(scrollConfig.scrollDistance[0], scrollConfig.scrollDistance[1])
      const interval = this.randomBetween(scrollConfig.scrollInterval[0], scrollConfig.scrollInterval[1])

      let delta = distance
      if (scrollConfig.direction === 'up') {
        delta = -distance
      } else if (scrollConfig.direction === 'both') {
        delta = Math.random() > 0.5 ? distance : -distance
      }

      await this.page.mouse.wheel({ deltaY: delta })

      if (scrollConfig.pauseAtBottom && delta > 0) {
        const atBottom = await this.page.evaluate(
          () => window.innerHeight + window.scrollY >= document.body.scrollHeight - 100
        )

        if (atBottom) {
          const pause = this.randomBetween(
            scrollConfig.bottomPauseDuration[0],
            scrollConfig.bottomPauseDuration[1]
          )
          this.log(`已到页面底部，暂停 ${pause}ms`, 'info')
          await this.delay(pause)
        }
      }

      await this.delay(interval)
    }
  }

  private async simulateMouseMove(): Promise<void> {
    const mouseConfig = this.config.mouseMove
    if (!mouseConfig) {
      return
    }

    const points = this.randomBetween(mouseConfig.movePoints[0], mouseConfig.movePoints[1])
    const viewport = this.page.viewport() || { width: 1920, height: 1080 }
    this.log(`执行鼠标移动，共 ${points} 个轨迹点`, 'action')

    let currentX = this.randomBetween(100, viewport.width - 100)
    let currentY = this.randomBetween(100, viewport.height - 100)

    for (let index = 0; index < points; index += 1) {
      const targetX = this.randomBetween(50, viewport.width - 50)
      const targetY = this.randomBetween(50, viewport.height - 50)
      const steps = this.randomBetween(5, 15)

      for (let step = 0; step <= steps; step += 1) {
        const t = step / steps
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        const nextX = currentX + (targetX - currentX) * ease + (mouseConfig.randomCurve ? this.randomBetween(-8, 8) : 0)
        const nextY = currentY + (targetY - currentY) * ease + (mouseConfig.randomCurve ? this.randomBetween(-8, 8) : 0)

        await this.page.mouse.move(nextX, nextY)
        await this.delay(this.randomBetween(mouseConfig.moveSpeed[0], mouseConfig.moveSpeed[1]))
      }

      currentX = targetX
      currentY = targetY
    }
  }

  private async simulateClick(): Promise<void> {
    const clickConfig = this.config.click
    if (!clickConfig) {
      return
    }

    let clicks = 0

    for (const selector of clickConfig.selectors) {
      if (clicks >= clickConfig.maxClicks) {
        break
      }

      if (Math.random() > clickConfig.clickProbability) {
        continue
      }

      try {
        const element = await this.waitForVisibleSelector(selector, 3000)
        if (!element) {
          continue
        }

        if (clickConfig.moveBeforeClick) {
          const box = await element.boundingBox()
          if (box) {
            await this.page.mouse.move(
              box.x + box.width / 2 + this.randomBetween(-5, 5),
              box.y + box.height / 2 + this.randomBetween(-5, 5)
            )
            await this.delay(this.randomBetween(100, 300))
          }
        }

        await element.click()
        clicks += 1
        this.log(`点击元素: ${selector}`, 'action')
        await this.delay(this.randomBetween(500, 1500))
      } catch {
        // Ignore missing or detached elements.
      }
    }
  }

  private async simulateInput(): Promise<void> {
    const inputConfig = this.config.input
    if (!inputConfig || !inputConfig.presetTexts.length) {
      return
    }

    for (const selector of inputConfig.selectors) {
      if (Math.random() > inputConfig.inputProbability) {
        continue
      }

      try {
        const element = await this.waitForVisibleSelector(selector, 3000)
        if (!element) {
          continue
        }

        await element.click()
        await this.page.evaluate((target) => {
          if ('value' in target) {
            ;(target as HTMLInputElement | HTMLTextAreaElement).value = ''
          }
        }, element)

        const text = inputConfig.presetTexts[Math.floor(Math.random() * inputConfig.presetTexts.length)]
        for (const char of text) {
          await this.page.keyboard.type(char)
          await this.delay(this.randomBetween(inputConfig.typingSpeed[0], inputConfig.typingSpeed[1]))
        }

        this.log(`输入完成: ${selector}`, 'action')
        await this.delay(this.randomBetween(300, 800))
      } catch {
        // Ignore input errors for optional interactions.
      }
    }
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'action'): void {
    console.log(`[Behavior] ${message}`)
    this.onLog?.(message, type)
  }

  private async waitForVisibleSelector(
    selector: string,
    timeout: number
  ): Promise<ElementHandle<Element> | null> {
    try {
      return await this.page.waitForSelector(selector, { visible: true, timeout })
    } catch {
      return null
    }
  }

  private shuffleArray<T>(items: T[]): T[] {
    const copied = [...items]
    for (let index = copied.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[copied[index], copied[swapIndex]] = [copied[swapIndex], copied[index]]
    }
    return copied
  }
}
