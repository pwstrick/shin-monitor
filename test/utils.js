/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 11:38:07
 * @LastEditTime: 2023-01-18 17:30:37
 * @Description: 
 * @FilePath: /web/shin-monitor/test/utils.js
 */
const expect = require('expect.js');

// ts 测试编译后文件
const utils = require('../src/utils.ts');

describe('randomNum', function() {
  it('1-10', function() {
    expect(utils.randomNum(10, 1)).to.be.within(1, 10);
    expect(utils.randomNum(10, 1)).to.be.within(1, 10);
    expect(utils.randomNum(10, 1)).to.be.within(1, 10);
    expect(utils.randomNum(10, 1)).to.be.within(1, 10);
    expect(utils.randomNum(10, 1)).to.be.within(1, 10);
    expect(utils.randomNum(10, 1)).to.be.within(1, 10);
  });
  it('10-1', function() {
    expect(utils.randomNum(1, 10)).to.be.within(1, 10);
    expect(utils.randomNum(1, 10)).to.be.within(1, 10);
    expect(utils.randomNum(1, 10)).to.be.within(1, 10);
    expect(utils.randomNum(1, 10)).to.be.within(1, 10);
    expect(utils.randomNum(1, 10)).to.be.within(1, 10);
    expect(utils.randomNum(1, 10)).to.be.within(1, 10);
  });
});
describe('rounded', function() {
  it('decimal', function() {
    expect(utils.rounded(5.45, 1)).to.be.equal(5.5);
    expect(utils.rounded(5.454, 2)).to.be.equal(5.45);
    expect(utils.rounded(5.5, 0)).to.be.equal(6);
  });
});
describe('kb', function() {
  it('1024', function() {
    expect(utils.kb(512)).to.be.equal(0.5);
    expect(utils.kb(1024)).to.be.equal(1);
    expect(utils.kb(1024 * 2)).to.be.equal(2);
  });
});
describe('assign', function() {
  it('cover', function() {
    expect(Object.assign({}, {a: 1})).to.only.have.keys('a');
    expect(Object.assign({a: 1}, {b: 1})).to.only.have.keys('a', 'b');
    expect(Object.assign({a: 1}, {a: 2})).to.eql({ a: 2});
    expect(Object.assign({a: { c: 2 }}, {a: { c: 1}})).to.eql({ a: { c: 1}});
  });
});
describe('removeQuote', function() {
  it('html', function() {
    expect(utils.removeQuote('<a href="">')).to.be.equal('<a href=>');
    expect(utils.removeQuote('<a href="1">')).to.be.equal('<a href=1>');
    expect(utils.removeQuote('<a href=""></a><div class=""></div>')).to.be.equal('<a href=></a><div class=></div>');
  });
});