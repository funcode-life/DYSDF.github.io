---
title: hello_world
author: 断崖上的风
date: 2021-09-15 19:34:20
category: 前端
tags:
  - js
  - css
  - html
---

> koa被认为是下一代的web框架，其最大的特点就是独特的中间件控制，是一个典型的对洋葱模型的实现。其中koa和koa2的中间件实现思路是一样的，只是具体实现有所区别，koa2在node7.6之后使用async/await替代generator函数，本文以async/await来实现洋葱模型。

<!-- more -->

### 洋葱模型

借来一张网上的图片来说明下，洋葱模型主要分两个过程——“出”和“入”，对于“入”方向先处理的中间件，在“出”方向时就会变成后处理，这样的好处是同一个中间件可以同时处理两个过程，而且不用在意顺序。在koa中，前置中间件就可以处理入方向的req请求和出方向的res结果，其处理逻辑类似于python平台中的django框架的中间件。

```js
console.log('hello world')
```

![testImage](banner.jpg)
