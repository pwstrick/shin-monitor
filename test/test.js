/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 10:17:17
 * @LastEditTime: 2023-01-13 22:46:57
 * @Description: 
 * @FilePath: /web/shin-monitor/test/test.js
 */
var expect = require('expect.js');
// ts 测试编译后文件
var shin = require('../src/index.ts').default;
describe('setParam', function() {
  it('defaults', function() {
    expect(shin.setParams()).to.be.equal(null);
    expect(shin.setParams({ token: 123})).to.have.property('token', 123);
    // expect(shin.setParams({ token: 123})).to.only.have.keys(['token', 'record', 
    //   'isDebug', 'isCrash', 'validateCrash', 'src', 'psrc', 'pkey', 'subdir', 'rate', 'version', 'identity']);
  });
});
