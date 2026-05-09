import { Page } from 'puppeteer'
import { BehaviorConfig } from '../../shared/types'

/**
 * 浏览器行为模拟器
 * 用于模拟真实用户的浏览行为，包括滚动、点击、鼠标移动、输入等
 */
export class BehaviorSimulator {
  private page: Page
  private config: BehaviorConfig

  constructor(page: Page, config: BehaviorConfig) {
    this.page = page
    this.config = config
  }

  /**
   * 执行所有行为模拟
   */
  async simulate(): Promise<void> {
    const behaviors = []

    // 1. 页面停留
    behaviors.push(this.stayOnPage())

    // 2. 鼠标移动
    if (this.config.mouseMove.enabled) {
      behaviors.push(this.simulateMouseMove())
    }

    // 3. 滚动
    if (this.config.scroll.enabled) {
      behaviors.push(this.simulateScroll())
    }

    // 4. 点击
    if (this.config.click.enabled && this.config.click.selectors.length > 0) {
      behaviors.push(this.simulateClick())
    }

    // 5. 输入
    if (this.config.input.enabled && this.config.input.selectors.length > 0) {
      behaviors.push(this.simulateInput())
    }

    // 随机顺序执行或顺序执行
    if (this.config.randomOrder) {
      const shuffled = this.shuffleArray(behaviors)
      for (const behavior of shuffled) {
        await behavior
      }
    } else {
      // 先停留，再执行其他行为
      await behaviors[0]
      for (let i = 1; i < behaviors.length; i++) {
        await behaviors[i]
      }
    }
  }

  /**
   * 页面停留
   */
  private async stayOnPage(): Promise<void> {
    const [min, max] = this.config.stayDuration
    const duration = this.randomBetween(min, max)
    console.log(`[Behavior] Staying on page for ${duration}ms`)
    await this.delay(duration)
  }

  /**
   * 模拟滚动行为
   */
  private async simulateScroll(): Promise<void> {
    const scrollConfig = this.config.scroll
    const scrollCount = this.randomBetween(scrollConfig.scrollCount[0], scrollConfig.scrollCount[1])
    
    console.log(`[Behavior] Starting scroll simulation, count: ${scrollCount}`)

    for (let i = 0; i < scrollCount; i++) {
      const distance = this.randomBetween(scrollConfig.scrollDistance[0], scrollConfig.scrollDistance[1])
      const interval = this.randomBetween(scrollConfig.scrollInterval[0], scrollConfig.scrollInterval[1])

      // 根据方向决定滚动
      let scrollDirection = 1 // 1 = down, -1 = up
      
      if (scrollConfig.direction === 'both') {
        scrollDirection = Math.random() > 0.5 ? 1 : -1
      } else if (scrollConfig.direction === 'up') {
        scrollDirection = -1
      }

      // 平滑滚动
      await this.smoothScroll(distance * scrollDirection, interval)

      // 如果到底部且启用了暂停
      if (scrollConfig.pauseAtBottom && scrollDirection === 1) {
        const isAtBottom = await this.isAtPageBottom()
        if (isAtBottom) {
          const pauseDuration = this.randomBetween(
            scrollConfig.bottomPauseDuration[0],
            scrollConfig.bottomPauseDuration[1]
          )
          console.log(`[Behavior] At bottom, pausing for ${pauseDuration}ms`)
          await this.delay(pauseDuration)
        }
      }

      await this.delay(interval)
    }
  }

  /**
   * 平滑滚动
   */
  private async smoothScroll(distance: number, duration: number): Promise<void> {
    const steps = 10
    const stepDistance = distance / steps
    const stepDuration = duration / steps

    for (let i = 0; i < steps; i++) {
      await this.page.evaluate((delta) => {
        (window as any).scrollBy(0, delta)
      }, stepDistance)
      await this.delay(stepDuration)
    }
  }

  /**
   * 检查是否到达页面底部
   */
  private async isAtPageBottom(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const win = window as any
      return (
        win.innerHeight + win.scrollY >=
        (document as any).body.scrollHeight - 100
      )
    })
  }

  /**
   * 模拟鼠标移动
   */
  private async simulateMouseMove(): Promise<void> {
    const mouseConfig = this.config.mouseMove
    const movePoints = this.randomBetween(mouseConfig.movePoints[0], mouseConfig.movePoints[1])

    console.log(`[Behavior] Simulating mouse movement, points: ${movePoints}`)

    // 获取页面尺寸
    const viewport = this.page.viewport()
    if (!viewport) return

    const maxX = viewport.width
    const maxY = viewport.height

    // 生成贝塞尔曲线控制点
    const points = this.generateBezierPoints(movePoints, maxX, maxY)

    for (const point of points) {
      const speed = this.randomBetween(mouseConfig.moveSpeed[0], mouseConfig.moveSpeed[1])
      
      if (mouseConfig.randomCurve) {
        // 添加随机偏移使轨迹更自然
        const offsetX = this.randomBetween(-5, 5)
        const offsetY = this.randomBetween(-5, 5)
        await this.page.mouse.move(point.x + offsetX, point.y + offsetY)
      } else {
        await this.page.mouse.move(point.x, point.y)
      }
      
      await this.delay(speed)
    }
  }

  /**
   * 生成贝塞尔曲线点（模拟人类鼠标轨迹）
   */
  private generateBezierPoints(count: number, maxX: number, maxY: number): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = []
    
    // 起点随机
    let currentX = this.randomBetween(0, maxX)
    let currentY = this.randomBetween(0, maxY)

    for (let i = 0; i < count; i++) {
      // 目标点随机
      const targetX = this.randomBetween(0, maxX)
      const targetY = this.randomBetween(0, maxY)

      // 使用贝塞尔曲线插值
      const t = i / count
      const bezierT = this.easeInOutQuad(t)
      
      const x = currentX + (targetX - currentX) * bezierT
      const y = currentY + (targetY - currentY) * bezierT

      points.push({ x: Math.round(x), y: Math.round(y) })
      
      currentX = targetX
      currentY = targetY
    }

    return points
  }

  /**
   * 缓动函数
   */
  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  }

  /**
   * 模拟点击行为
   */
  private async simulateClick(): Promise<void> {
    const clickConfig = this.config.click
    let clicksPerformed = 0

    console.log(`[Behavior] Starting click simulation`)

    for (const selector of clickConfig.selectors) {
      if (clicksPerformed >= clickConfig.maxClicks) break

      // 检查是否满足点击概率
      if (Math.random() > clickConfig.clickProbability) continue

      try {
        // 等待元素出现
        const element = await this.page.$(selector)
        if (!element) {
          console.log(`[Behavior] Element not found: ${selector}`)
          continue
        }

        // 检查元素是否可见
        const isVisible = await element.isIntersectingViewport()
        if (!isVisible) {
          console.log(`[Behavior] Element not visible: ${selector}`)
          continue
        }

        // 获取元素位置
        const boundingBox = await element.boundingBox()
        if (!boundingBox) continue

        // 点击前移动鼠标
        if (clickConfig.moveBeforeClick) {
          const centerX = boundingBox.x + boundingBox.width / 2
          const centerY = boundingBox.y + boundingBox.height / 2
          
          // 添加一些随机偏移
          const offsetX = this.randomBetween(-5, 5)
          const offsetY = this.randomBetween(-5, 5)
          
          await this.page.mouse.move(centerX + offsetX, centerY + offsetY)
          await this.delay(this.randomBetween(100, 300))
        }

        // 点击
        await element.click()
        clicksPerformed++
        console.log(`[Behavior] Clicked: ${selector}`)

        // 点击后等待
        await this.delay(this.randomBetween(500, 1500))
      } catch (error) {
        console.log(`[Behavior] Click failed for ${selector}:`, error)
      }
    }

    console.log(`[Behavior] Click simulation complete, total clicks: ${clicksPerformed}`)
  }

  /**
   * 模拟输入行为
   */
  private async simulateInput(): Promise<void> {
    const inputConfig = this.config.input

    console.log(`[Behavior] Starting input simulation`)

    for (const selector of inputConfig.selectors) {
      // 检查是否满足输入概率
      if (Math.random() > inputConfig.inputProbability) continue

      try {
        // 等待输入框出现
        await this.page.waitForSelector(selector, { timeout: 3000 })

        // 清空输入框
        await this.page.$eval(selector, (el: any) => (el.value = ''))

        // 选择要输入的文本
        if (inputConfig.presetTexts.length === 0) continue
        const text = inputConfig.presetTexts[Math.floor(Math.random() * inputConfig.presetTexts.length)]

        // 聚焦输入框
        await this.page.focus(selector)

        // 逐字输入（模拟打字）
        for (const char of text) {
          await this.page.keyboard.type(char)
          const typingDelay = this.randomBetween(inputConfig.typingSpeed[0], inputConfig.typingSpeed[1])
          await this.delay(typingDelay)
        }

        console.log(`[Behavior] Input completed for: ${selector}`)

        // 输入后等待
        await this.delay(this.randomBetween(300, 800))
      } catch (error) {
        console.log(`[Behavior] Input failed for ${selector}:`, error)
      }
    }
  }

  /**
   * 工具方法：随机范围值
   */
  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  /**
   * 工具方法：延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 工具方法：打乱数组
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
}
