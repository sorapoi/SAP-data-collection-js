// ==UserScript==
// @name         表格悬浮显示
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  鼠标悬浮显示表格第三列的值
// @author       Your name
// @match        */*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 创建一个tooltip元素
    const tooltip = document.createElement('div');
    tooltip.style.cssText = 'position: fixed; background: #333; color: white; padding: 10px; border-radius: 3px; display: none; z-index: 9999; max-width: 500px; max-height: 300px; overflow: auto;';
    document.body.appendChild(tooltip);

    // 创建内容缓存
    const contentCache = new Map();

    // 获取页面内容的函数
    async function fetchPageContent(url) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',  // 包含认证信息
                headers: {
                    'Accept': 'text/html',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // 使用更精确的选择器获取内容
            const contentSelectors = [
                '.lui_review_main_content',
                '.review-main-content',
                '#review-content',
                '.lui-component-frame',
                '.lui-component-main',
                '.lui-component-content'
            ];

            let content = '';
            for (const selector of contentSelectors) {
                const element = doc.querySelector(selector);
                if (element) {
                    content += element.innerHTML;
                }
            }

            if (content) {
                return content;
            } else {
                // 如果找不到特定内容区域，尝试获取主要内容区域
                const mainArea = doc.querySelector('main') || 
                                doc.querySelector('.main-content') || 
                                doc.querySelector('#main');
                if (mainArea) {
                    return mainArea.innerHTML;
                } else {
                    // 最后尝试获取body内容
                    return doc.body ? doc.body.innerHTML : '无法获取页面内容';
                }
            }
        } catch (error) {
            console.error('获取页面内容失败：', error);
            return '获取页面内容失败：' + error.message;
        }
    }

    // 为表格行添加事件监听器
    function addEventListeners(row) {
        let isLoading = false;

        // 监听鼠标悬浮事件
        row.addEventListener('mouseover', async function(e) {
            const kmss_fdid = row.getAttribute('kmss_fdid');
            if (kmss_fdid && !isLoading) {
                isLoading = true;
                const baseUrl = window.location.origin;
                const url = `${baseUrl}/km/review/km_review_main/kmReviewMain.do?method=view&fdId=${kmss_fdid}`;
                
                tooltip.style.display = 'block';
                tooltip.style.left = (e.pageX + 10) + 'px';
                tooltip.style.top = (e.pageY + 10) + 'px';

                let content;
                if (contentCache.has(kmss_fdid)) {
                    content = contentCache.get(kmss_fdid);
                    tooltip.innerHTML = content;
                } else {
                    tooltip.textContent = '加载中...';
                    content = await fetchPageContent(url);
                    if (content) {
                        contentCache.set(kmss_fdid, content);
                        if (tooltip.style.display === 'block') { // 确保鼠标还在元素上
                            tooltip.innerHTML = content;
                        }
                    }
                }
                isLoading = false;
            }
        });

        // 监听鼠标移出事件
        row.addEventListener('mouseout', function() {
            tooltip.style.display = 'none';
            isLoading = false;
        });

        // 监听鼠标移动事件，更新tooltip位置
        row.addEventListener('mousemove', function(e) {
            if (tooltip.style.display === 'block') {
                tooltip.style.left = (e.pageX + 10) + 'px';
                tooltip.style.top = (e.pageY + 10) + 'px';
            }
        });
    }

    // 初始化和更新tooltip
    function initializeTooltips() {
        // 使用Set来存储已处理过的行元素
        const processedRows = new Set();

        // 使用MutationObserver监听DOM变化
        const observer = new MutationObserver((mutations) => {
            // 使用XPath选择器获取目标表格行
            const xpath = '//*[@id="lui-id-39"]/div[4]/div[1]/div/div/table/tbody/tr';
            const targetRows = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            const rows = [];
            for (let i = 0; i < targetRows.snapshotLength; i++) {
                const row = targetRows.snapshotItem(i);
                // 检查该行是否已经处理过
                if (!processedRows.has(row)) {
                    rows.push(row);
                    processedRows.add(row);
                }
            }

            if (rows.length > 0) {
                console.log('找到新的表格行，数量：', rows.length);

                rows.forEach(function(row) {
                    // 直接添加事件监听器，不再使用克隆方式
                    addEventListeners(row);
                });
            }
        });

        // 开始观察整个文档的变化
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeTooltips);
    } else {
        initializeTooltips();
    }
})();