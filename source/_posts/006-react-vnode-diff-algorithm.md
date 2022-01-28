---
title: React vNode Diff算法
date: 2022-01-28 20:34:48
author: 断崖上的风
category: 算法
tags:
  - 前端
  - 算法
  - react
---

> 用了这么久的MVVM框架，我们都知道MVVM框架相较于jQuery时代，最大的改变就是使用了vNode(虚拟节点)代替了真实的DOM元素做更新，在所有vNode都更新完之后，一次性更新真实DOM元素，防止产生回流重绘。
>
> 但是，更新vNode tree也是有代价的，不可能每次更新都是全量更新，而是针对有修改的vNode进行new/patch操作，而怎么确定哪些vNode需要进行更新操作，这就涉及到我们今天要讲的内容：diff算法。

<!-- more -->

本文不讲解vNode的实现、mount挂载及render渲染，只着重讲解算法，下面的diff算法中会出现几个方法，在这里进行罗列，并说明其功能：

  - `mount(vNode, parent, [refNode])`: 主要功能是通过vNode生成真实的DOM节点，并插入到parent为父级的真实DOM节点中；refNode为真实的DOM节点，其父级节点也为parent；如果refNode不为空，vNode生成的DOM节点就会插入到refNode之前；如果refNode为空，那么vNode生成的DOM节点就作为最后一个子节点插入到parent中。

  - `patch(prevNode, nextNode, parent)`: 主要功能是给当前DOM节点进行更新，并且调用diff算法对比自身的子节点;

### React Diff

React的思路是递增法。通过对比新列表中的节点在旧列表中的位置是否是递增，来判断当前节点是否需要移动。

#### 1.实现原理

首先我们看这样一个例子

![react diff img 1](post_01.png)

从上图中，我们可以看出，新旧列表没有任何变化，也就是说新列表无需移动任何节点。下面我们用react的递增思想，解释一下为什么新列表中的节点不需要移动。

我们首先遍历`new nodes`，找到每一个节点在`old nodes`中的位置。

```js
function reactDiff(newNodes, oldNodes) {
  for (let i = 0; i < newNodes.length; i++) {
    const newNode = newNodes[i];
    for (let j = 0; j < oldNodes.length; j++) {
        const oldNode = oldNodes[j]
        if (newNode === oldNode) {
          // todo
        }
    }
  }
}
```

找到位置以后，与上一个节点的位置进行对比。如果当前的位置大于上一个位置，说明当前节点不需要移动；如果小于上一个位置，则需要进行移动。

```js
function reactDiff(newNodes, oldNodes) {
  let lastIndex = 0
  for (let i = 0; i < newNodes.length; i++) {
    const newNode = newNodes[i];
    for (let j = 0; j < oldNodes.length; j++) {
        const oldNode = oldNodes[j]
        if (newNode === oldNode) {
          if (j < lastIndex) {
            // need move
          } else {
            // do not need move
            lastIndex = j
          }
        }
    }
  }
}
```

在上面的例子中，`new nodes`每个节点在`old nodes`中的位置为`0, 1, 2, 3`。每一项都要比前一项要大，所以不需要移动，这就是react的diff算法的原理。

#### 2.节点判断

上面的例子中，我们使用了`===`来进行节点相同判断，但是在实际框架中，vNode是一个对象，即使数据没有变化也会重新创建，但是在js中，这已经是两个值了。这时我们该如何处理呢？

答案就是`key`，在生成vNode的时候，我们会分配唯一的key值，以此来确定每个节点的唯一性，并用于进行新旧列表的对比。

```js
function reactDiff(newNodes, oldNodes) {
  let lastIndex = 0
  for (let i = 0; i < newNodes.length; i++) {
    const newNode = newNodes[i];
    for (let j = 0; j < oldNodes.length; j++) {
        const oldNode = oldNodes[j]
        if (newNode.key === oldNode.key) {
          if (j < lastIndex) {
            // need move
          } else {
            // do not need move
            lastIndex = j
          }
        }
    }
  }
}
```

#### 3.节点移动

首先明确一点，这里的`移动节点`指的是移动vNode所对应的真实DOM节点，patch方法会将更新过后的DOM节点，赋值给新的vNode。

![react diff img 2](post_02.png)

我们将上图的例子代入`reactDiff`中执行。

首先遍历`new nodes`，并查找vNode在`old nodes`中的位置。当遍历到`vNode d`时，之前遍历的位置为`0 < 2 < 3`，说明`A C D`这三个DOM节点都是不需要移动的。此时`lastIndex = 3`, 并进入下一次循环，发现`vNode b`在`old nodes`中的index为`1`，小于`lastIndex`，说明`DOM B`要移动。

再通过观察我们发现，其实只需要把`DOM B`移动到`DOM D`之后就可以了。也就是找到需要移动的vNode，将其对应的真实的DOM节点移动到新列表中的前一个vNode对应的真实DOM的后面即可。

![react diff img 3](post_03.png)

在上述的例子中，就是将`vNode b`对应的真实DOM节点`DOM B`, 移动到`vNode b`在新列表中的前一个vNode——`vNode d`对应的真实DOM节点`DOM D`的后面。

```js
function reactDiff(newNodes, oldNodes, parent) {
  let lastIndex = 0
  for (let i = 0; i < newNodes.length; i++) {
    const newNode = newNodes[i];
    for (let j = 0; j < oldNodes.length; j++) {
        const oldNode = oldNodes[j]
        if (newNode.key === oldNode.key) {
          patch(oldNode, newNode, parent)
          if (j < lastIndex) {
            // need move
            const refNode = newNodes[i - 1].el.nextSibling;
            parent.insertBefore(newNode.el, refNode)
          } else {
            // do not need move
            lastIndex = j
          }
        }
    }
  }
}
```

为什么是这样移动的呢？因为vNode跟DOM是一一对应的，vNode的顺序就是DOM的顺序，这就意味着对于当前vNode节点来说，它的位置就是DOM节点的位置，如果该节点需要移动，那么只需要将DOM节点移动到前一个vNode节点之后就可以，因为在列表中vNode的顺序就是这样的。

#### 4.节点添加

前面我们只讲了节点移动，就是新旧列表的元素都是相同的，只是顺序位置有所变化，这一节，我们讲讲在新列表中有全新的vNode节点的情况。

遇到这种情况，我们需要根据新的VNode节点生成DOM节点，并插入DOM树中。

此时，我们面临两个问题：
  1. 如何发现全新的节点
  2. 生成的DOM节点插入到哪里

![react diff img 4](post_04.png)

先来解决第一个问题，找节点还是比较简单的，我们定义一个`existed`变量值，初始值为`false`。如果在旧列表找到了`key`相同的`vNode`，就将`existed`的值改为`true`。遍历结束后判断`existed`值，如果为`false`，说明当前节点为新节点。

```js
function reactDiff(newNodes, oldNodes, parent) {
  let lastIndex = 0
  for (let i = 0; i < newNodes.length; i++) {
    const newNode = newNodes[i];
    let existed = false
    for (let j = 0; j < oldNodes.length; j++) {
        const oldNode = oldNodes[j]
        if (newNode.key === oldNode.key) {
          existed = true
          patch(oldNode, newNode, parent)
          if (j < lastIndex) {
            // need move
            const refNode = newNodes[i - 1].el.nextSibling;
            parent.insertBefore(newNode.el, refNode)
          } else {
            // do not need move
            lastIndex = j
          }
        }
    }

    if (existed) {
      // need create
    }
  }
}
```

找到新节点后，接下来就是插入到哪里了。这里的逻辑其实和移动节点的逻辑是一样的。

我们观察上图可以发现，新的`vNode c`是紧跟在`vNode b`后面的，所以我们只需要将`vNode c`的DOM节点插入到`vNode b`的DOM节点`DOM-B`之后就可以了。

不过有一种特殊情况需要注意，就是新的节点位于新列表的第一个，这时需要找到旧列表第一个vNode，将新vNode的DOM节点插入到旧列表第一个vNode之前就可以了。

```js
function reactDiff(newNodes, oldNodes, parent) {
  let lastIndex = 0
  for (let i = 0; i < newNodes.length; i++) {
    const newNode = newNodes[i];
    let existed = false
    for (let j = 0; j < oldNodes.length; j++) {
        const oldNode = oldNodes[j]
        if (newNode.key === oldNode.key) {
          existed = true
          patch(oldNode, newNode, parent)
          if (j < lastIndex) {
            // need move
            const refNode = newNodes[i - 1].el.nextSibling;
            parent.insertBefore(newNode.el, refNode)
          } else {
            // do not need move
            lastIndex = j
          }
        }
    }

    if (existed) {
      // need create
      const refNode = i <= 0
        ? oldNodes[0].el
        : newNodes[i - 1].el.nextSibling
      mount(newNode, parent, refNode);
    }
  }
}
```

#### 5.节点删除

有增就有减，当旧的节点不在新列表中时，我们就需要将其对应的DOM节点移除。

思路就是在进行过新旧节点对比之后，再遍历一遍旧节点列表，如果发现节点不在新列表中，则进行移除操作。

```js
function reactDiff(newNodes, oldNodes, parent) {
  let lastIndex = 0
  for (let i = 0; i < newNodes.length; i++) {
    const newNode = newNodes[i];
    let existed = false
    for (let j = 0; j < oldNodes.length; j++) {
        const oldNode = oldNodes[j]
        if (newNode.key === oldNode.key) {
          existed = true
          patch(oldNode, newNode, parent)
          if (j < lastIndex) {
            // need move
            const refNode = newNodes[i - 1].el.nextSibling;
            parent.insertBefore(newNode.el, refNode)
          } else {
            // do not need move
            lastIndex = j
          }
        }
    }

    if (existed) {
      // need create
      const refNode = i <= 0
        ? oldNodes[0].el
        : newNodes[i - 1].el.nextSibling
      mount(newNode, parent, refNode);
    }
  }

  for (const oldNode of oldNodes) {
    const key = oldNode.key
    const has = newNodes.find(n => n.key === key);
    if (!has) parent.removeChild(oldNode.el)
  }
}
```

#### 6.优化与不足

目前`reactDiff`的时间复杂度为`O(m*n)`，主要的时间消耗是在寻找旧节点列表位置上。

对此，我们可以用空间换时间，把`vNode`与`index`的关系维护成一个`Map`，从而将时间复杂度进一步降低，至于能不能达到`O(n)`，这个就要看`Map`的实现了。

```js
function reactDiff(newNodes, oldNodes, parent) {
  // preprocess
  const oldNodeMap = new Map()
  for (let i = 0; i < oldNodes.length; i++) {
    const n = oldNodes[i]
    oldNodeMap.set(n.key, {
      index: i,
      node: n
    })
  }

  let lastIndex = 0
  for (let i = 0; i < newNodes.length; i++) {
    const newNode = newNodes[i];
    let existed = false

    const record = oldNodeMap.get(newNode.key)
    if (record) {
      const { node: oldNode, index: j } = record
      existed = true
      patch(oldNode, newNode, parent)
      if (j < lastIndex) {
        // need move
        const refNode = newNodes[i - 1].el.nextSibling;
        parent.insertBefore(newNode.el, refNode)
      } else {
        // do not need move
        lastIndex = j
      }
    }

    if (existed) {
      // need create
      const refNode = i <= 0
        ? oldNodes[0].el
        : newNodes[i - 1].el.nextSibling
      mount(newNode, parent, refNode);
    }
  }

  for (const oldNode of oldNodes) {
    const key = oldNode.key
    const has = newNodes.find(n => n.key === key);
    if (!has) parent.removeChild(oldNode.el)
  }
}
```

不过，即使这样，react的diff算法仍然存在改进空间。我们看这样一个例子。

![react diff img 5](post_05.png)

根据`reactDiff`的算法，我们需要先将`DOM A`移动到`DOM C`之后，然后再将`DOM B`移动到`DOM A`之后。

但是通过观察可以发现，其实只要将`DOM C`移动到`DOM A`之前就可以完成diff。

这里就是可优化的空间，下一次我们介绍`vue2.x`中的diff算法：`双端比较`，该算法解决了上述问题。
