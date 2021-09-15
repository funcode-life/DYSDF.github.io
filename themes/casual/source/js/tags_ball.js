(function ($) {
  // 接口对象实现
  function Interface(name, methods) {
    if (!methods || Object.prototype.toString.call(methods) !== '[object Array]' || methods.length === 0) {
      throw new Error('Interface required methods')
    }
    this.name = name
    this.methods = methods
  }
  Interface.ensureImplements = function (instance) {
    if (arguments.length === 1) {
      throw new Error('Function Interface.ensureImplements called with 1 argument, but excepted at least 2')
    }

    for (var i = 1, len = arguments.length; i < len; i++) {
      var interface = arguments[i]
      if (!interface instanceof Interface) {
        throw new Error('Interface.ensureImplements excepted arguments above to be instance of Interface')
      }

      for (var j = 0, length = interface.methods.length; j < length; j++) {
        var method = interface.methods[j]
        if (!instance[method] || typeof instance[method] !== 'function') {
          throw new Error('Function Interface.ensureImplements: object does not implement the ' +
            interface.name +
            ' interface, method ' +
            method +
            ' does not found')
        }
      }
    }
  }
  // 接口对象定义
  var StageInterface = new Interface('StageInterface', ['animate', 'addChild'])
  var TagInterface = new Interface('TagInterface', ['setRotate', 'setSpeed', 'translate', 'draw'])

  // 类式继承 extend 函数
  function extend(subClass, superClass) {
    // 用一个空函数引用父类原型
    // 因为是空函数，所以在构造过程中不会出现因参数问题导致的报错
    var F = function () { }
    F.prototype = superClass.prototype
    // 子类继承
    subClass.prototype = new F()
    // 重设 constructor
    subClass.constructor = subClass
    // 存储父类构造函数
    subClass.superClass = superClass
  }

  // 订阅发布者
  function Observer() {
    this.subs = {}
  }
  Observer.prototype.addSub = function (name, func) {
    if (!this.subs[name]) {
      this.subs[name] = []
    }
    this.subs[name].push(func)
  }
  Observer.prototype.fire = function (name, data) {
    var listeners = this.subs[name] || []
    for (var i = 0, len = listeners.length; i < len; i++) {
      listeners[i](data)
    }
  }

  // 鼠标位移计算对象
  function MouseTransform(target, origin) {
    MouseTransform.superClass.call(this)

    this.target = target
    this.origin = origin || { x: 0, y: 0 }
    var self = this
    this.target.addEventListener('mousemove', function (event) {
      self.transform(event)
    })
  }
  extend(MouseTransform, Observer)
  // 计算函数
  MouseTransform.prototype.transform = function (event) {
    var offsetX = event.offsetX - this.origin.x,
      offsetY = event.offsetY - this.origin.y;

    var rotateR = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
    var φ = Math.acos(offsetY / rotateR);
    if (offsetX < 0) {
      φ *= -1
    }
    // 自转轴角度
    var rotate = φ + Math.PI / 2
    // 发布订阅
    this.fire('polar', {
      angle: rotate,
      r: rotateR
    })
    this.fire('cartesian', {
      x: offsetX,
      y: offsetY
    })
  }

  // 动画舞台
  function Stage(canvas, options) {
    if (options === undefined) {
      throw new Error('Stage class required options arugment')
    }
    // canvas
    this.canvas = canvas
    // context
    this.context = this.canvas.getContext('2d')
    // 子元素集合
    this.children = []
    this.addChildren(options.children || [])

    // 动画判断 flag
    this.isRunning = false

    // 坐标系
    this.width = this.canvas.width
    this.height = this.canvas.height
    this.origin = options.origin || { x: 0, y: 0 }

    // 鼠标位置
    this.mousePosition = {
      x: -this.width / 2,
      y: -this.height / 2,
      angle: 0,
      r: 180
    }
    var self = this
    var mouseTransform = new MouseTransform(this.canvas, this.origin)
    mouseTransform.addSub('cartesian', function (mousePos) {
      self.mousePosition.x = mousePos.x
      self.mousePosition.y = mousePos.y
    })
    mouseTransform.addSub('polar', function (data) {
      self.mousePosition.angle = data.angle
      self.mousePosition.r = data.r
    })
    // 初始化时不一定存在mousemove事件，所以先模拟一个
    // var mouseEvent = new MouseEvent('mousemove', {
    //   offsetX: this.width,
    //   offsetY: this.height / 2
    // })
    // this.canvas.dispatchEvent(mouseEvent)
  }
  // 添加子元素
  Stage.prototype.addChild = function (child) {
    // if (Interface.ensureImplements(child, TagInterface)) {
    // 	child.$parent = this
    // 	this.children.push(child)
    // } else {
    // 	throw new Error('Stage method addChild required a TagInstance implement TagInterface')
    // }
    child.$stage = this
    this.children.push(child)
  }
  Stage.prototype.addChildren = function (children) {
    for (var i = 0, len = children.length; i < len; i++) {
      this.addChild(children[i])
    }
  }
  // 获取舞台鼠标位置信息
  Stage.prototype.getMousePosition = function () {
    return this.mousePosition
  }
  // 子元素绘制函数
  Stage.prototype.draw = function () {
    for (var i = 0, len = this.children.length; i < len; i++) {
      this.children[i].draw(this.context)
    }
  }
  // 舞台开始动画函数
  Stage.prototype.start = function () {
    this.isPause = false
    if (!this.isRunning) {
      var self = this
      self.isRunning = true
      self.context.save()
      self.context.translate(self.origin.x, self.origin.y)
      var animate = function () {
        if (self.isRunning) {
          if (!self.isPause) {
            self.context.clearRect(-self.origin.x, -self.origin.y, self.width, self.height)
            self.draw()
          }
          window.requestAnimationFrame(animate)
        }
      }
      animate()
    }
  }
  // 舞台暂停动画
  Stage.prototype.pause = function () {
    this.children.forEach(function (child) {
      child.fire('pause')
    })
  }
  // 舞台停止动画
  Stage.prototype.stop = function () {
    this.isRunning = false
    this.context.restore()
  }

  // 标签对象
  function Tag(x, y, z, r, speed, rotate, label, href, fontSize) {
    Tag.superClass.call(this)
    // 球坐标信息
    this.x = x
    this.y = y
    this.z = z
    this.r = r
    this.speed = speed
    this.rotate = rotate

    // 显示信息
    this.info = {
      label: label,
      href: href,
      fontSize: fontSize,
    }

    this.pos = {}

    this.isPause = false
  }
  extend(Tag, Observer)
  // 设置标签自转轴角度接口
  Tag.prototype.setRotate = function (angle) {
    this.rotate = angle
  }
  // 设置标签自转速度接口
  Tag.prototype.setSpeed = function (speed) {
    this.speed = speed
  }
  // 标签对象位置变换函数
  Tag.prototype.translate = function () {
    if (!this.isPause) {
      // 从舞台获取 mouse 位置信息
      this.setRotate(this.$stage.mousePosition.angle)
      this.setSpeed(this.$stage.mousePosition.r / 250 * Math.PI / 360)
      // 绕 z 轴旋转坐标系
      var x1 = this.x * Math.cos(-this.rotate) + this.y * Math.sin(-this.rotate),
        y1 = this.y * Math.cos(-this.rotate) - this.x * Math.sin(-this.rotate);

      // 绕 y 轴旋转
      var x2 = x1 * Math.cos(this.speed) + this.z * Math.sin(this.speed);
      this.z = this.z * Math.cos(this.speed) - x1 * Math.sin(this.speed);

      // 复原坐标系
      this.x = x2 * Math.cos(this.rotate) + y1 * Math.sin(this.rotate);
      this.y = y1 * Math.cos(this.rotate) - x2 * Math.sin(this.rotate);
    } else {
      this.isPause = false
    }
  }
  // 设置标签块位置大小
  Tag.prototype.setPosition = function (textWidth) {
    this.pos.x = this.x * this.r - textWidth / 2
    this.pos.y = this.y * this.r - this.info.fontSize / 2
    this.pos.z = this.z
    this.pos.w = textWidth
    this.pos.h = this.info.fontSize
  }
  // 标签是否被悬停
  Tag.prototype.isHover = function () {
    var flag = false
    var mousePos = this.$stage.getMousePosition()
    if (mousePos.x > this.pos.x &&
      mousePos.x < this.pos.x + this.pos.w &&
      mousePos.y > this.pos.y &&
      mousePos.y < this.pos.y + this.pos.h &&
      this.pos.z > 0) {
      flag = true
      this.fire('hover')
    }
    return flag
  }
  // 标签绘制接口
  Tag.prototype.draw = function (context) {
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = 'bold ' + this.info.fontSize + 'px Arial';
    this.setPosition(context.measureText(this.info.label).width)
    if (this.isHover()) {
      context.fillStyle = "rgba(255, 0, 0, " + (this.z * 0.45 + 0.55) + ")";
    } else {
      context.fillStyle = "rgba(0, 0, 0, " + (this.z * 0.45 + 0.55) + ")";
    }
    context.fillText(this.info.label, this.x * this.r, this.y * this.r);

    this.translate()
  }

  // 初始化函数
  $.extend({
    initTags: function (el, tags) {
      if (!(el instanceof HTMLCanvasElement)) throw new Error('el must be canvas element')

      var width = el.clientWidth
      el.width = width
      el.height = width

      // 标签重构函数
      function reshapeTags(tags) {
        // 运动半径
        var rotate_radis = width / 2.5;
        var len = tags.length
        var rotate_count = Math.ceil(len / 8)
        var font_size = 18
        return tags.map(function (tag, i) {
          var θ, φ, r, x, y, z;
          y = 2 * i / len - 1 // 计算 y，它平均分布在螺旋曲线上
          φ = y * Math.PI * rotate_count // 计算方位角
          θ = Math.acos(y) // 计算天顶角
          r = Math.sin(θ) //计算旋转半径
          x = Math.sin(φ) * r // x坐标
          z = Math.cos(φ) * r // z坐标

          var label = tag.name
          var href = tag.href

          return new Tag(x, y, z, rotate_radis, Math.PI / 360, 0, label, href, font_size)
        })
      }

      // 计算初始标签
      var tags = reshapeTags(tags)

      // 新建舞台
      var stage = new Stage(el, {
        children: tags,
        origin: {
          x: width / 2,
          y: width / 2
        }
      })

      el.addEventListener('mousemove', function (event) {
        var isPause = tags.some(function (tag) {
          return tag.isPause
        })
        event.target.className = isPause ? 'hover' : ''
      })
      el.addEventListener('click', function (event) {
        tags.forEach(function (tag) {
          if (tag.isHover()) {
            var href = tag.info.href
            window.open(href, href.startsWith('http') ? '_blank' : '_self')
            event.target.dispatchEvent(new MouseEvent('mousemove', {
              clientX: width,
              clientY: width
            }))
          }
        })
      })

      tags.forEach(function (tag) {
        // 标签悬停时
        tag.addSub('hover', function () {
          tags.forEach(function (tag) {
            tag.isPause = true
          })
        })
      })

      stage.start()
    }
  })
})(jQuery)
