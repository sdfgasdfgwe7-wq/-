$(function() {
    if (window.__scriptInitialized) return;
    window.__scriptInitialized = true;

    const Config = {
        game: { sound: true, itemSound: true },
        grid: { rows: 6, cols: 5, width: 380, height: 460 },
        item: { 
            fontSize: 17,
            imgBase: 52,
            spacing: 0,
            minScale: 1.0,
            maxScale: 2.5,
            multiplier: 0.43
        },
        searchTimes: { red: 2.45, orange: 2.45, gold: 0.55, purple: 0.25 },
        coin: { positions: 3, chances: [100, 100, 100], min: 1000, max: 2999 },
        purpleSpawn: { min: 2, max: 3 },
        valueRange: { min: 1, max: 4000000, base: 1000 },
        valueWeight: { baseWeight: 100, decayFactor: 0.00005, minWeight: 10 },
        spawn: { red: 0.7, orange: 1.4, gold: 2.8, purple: 5 },
        storageKey: "darkzone_simulator_stats",
        titles: [
            { value: 0, name: '暗区新锐', icon: 'pictures/icons/XR.png', description: '初入暗区' },
            { value: 1000000, name: '暗区尖兵', icon: 'pictures/icons/JB.png', description: '累计价值突破1M' },
            { value: 10000000, name: '暗区精英', icon: 'pictures/icons/JY.png', description: '累计价值突破10M' },
            { value: 50000000, name: '暗区专家', icon: 'pictures/icons/ZJ.png', description: '累计价值突破50M' },
            { value: 100000000, name: '暗区大师', icon: 'pictures/icons/DS.png', description: '累计价值突破100M' },
            { value: 500000000, name: '暗区王牌', icon: 'pictures/icons/WP.png', description: '累计价值突破500M' },
            { value: 1000000000, name: '暗区传说', icon: 'pictures/icons/CS.png', description: '累计价值突破1000M' }
        ]
    };
    
    const State = _.assign({}, {
        items: [],
        searchQueue: [],
        currentSearch: null,
        searchedItems: 0,
        totalValue: 0,
        highestValue: 0,
        searchTime: 0,
        inventory: [],
        grid: _.times(Config.grid.rows, () => _.times(Config.grid.cols, () => 0)),
        isSearching: false,
        isPaused: false,
        searchTimer: null,
        currentSearchTime: 0,
        isFirstOpen: true,
        isOpenSafeBtnDisabled: false,
        pauseStartTime: 0,
        pauseElapsed: 0,
        totalAccumulatedValue: 0,
        sessionAccumulatedValue: 0
    });

    let itemsConfig = [];
    let allItemsConfig = [];

    const Assets = {
        donate: ['pictures/donate/donate1.jpg']
    };

const BackgroundManager = {
    backgrounds: [],
    currentIndex: 0,
    selectedIndex: 0,
    configPath: 'xml/backgrounds.xml',
    storageKey: 'ab_selected_bg_path',
    ownedKey: 'ab_owned_backgrounds',

    getOwnedBackgrounds() {
        try {
            const data = localStorage.getItem(this.ownedKey);
            return data ? JSON.parse(data) : [1];
        } catch(e) {
            return [1];
        }
    },

    saveOwnedBackgrounds(ids) {
        localStorage.setItem(this.ownedKey, JSON.stringify(ids));
    },

    isBackgroundUnlocked(bgId) {
        const owned = this.getOwnedBackgrounds();
        return owned.includes(Number(bgId));
    },

    purchaseBackground(bgId) {
        const bg = this.backgrounds.find(b => Number(b.id) === Number(bgId));
        if (!bg) return { success: false, message: '背景不存在' };
        if (this.isBackgroundUnlocked(bgId)) return { success: false, message: '已拥有此背景' };

        const price = Number(bg.price) || 0;
        if (State.totalAccumulatedValue < price) {
            return { success: false, message: `累计价值不足，需要 ${Utils.formatCurrency(price)}` };
        }

        State.totalAccumulatedValue -= price;
        StatsManager.saveAccumulatedStats();
        StatsManager.updateAccumulatedValueDisplay();

        const owned = this.getOwnedBackgrounds();
        if (!owned.includes(Number(bgId))) {
            owned.push(Number(bgId));
            this.saveOwnedBackgrounds(owned);
        }

        return { success: true, message: `成功购买背景: ${bg.name}` };
    },

previewCurrentBackground() {
    const bg = this.backgrounds[this.currentIndex];
    if (!bg) {
        if (window.showToast) window.showToast('请选择一个背景');
        return;
    }
    
    const isVideo = bg.path.endsWith('.mp4');
    
    if (isVideo) {
        const existingPreview = document.getElementById('bg-preview-overlay');
        if (existingPreview) existingPreview.remove();
        
        const $overlay = $(`
            <div id="bg-preview-overlay" style="position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;background:#000;display:flex;align-items:center;justify-content:center;">
                <video id="bg-preview-video" muted style="width:100%;height:100%;object-fit:cover;" playsinline poster="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=">
                    <source src="${bg.path}" type="video/mp4">
                </video>
                <div style="position:absolute;bottom:40px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.6);font-size:14px;background:rgba(0,0,0,0.5);padding:8px 20px;border-radius:20px;pointer-events:none;">
                    <i class="fas fa-eye"></i> 预览: ${bg.name} — 播放结束后自动关闭
                </div>
            </div>
        `);
        
        $('body').append($overlay);
        
        const video = document.getElementById('bg-preview-video');
        video.volume = 0;
        video.play().catch(() => {});
        
        video.addEventListener('ended', function() {
            $('#bg-preview-overlay').fadeOut(500, function() {
                $(this).remove();
            });
        });
        
        $overlay.on('click', function() {
            $(this).fadeOut(300, function() {
                $(this).remove();
                if (video) {
                    video.pause();
                    video.src = '';
                }
            });
        });
    } else {
        const $overlay = $(`
            <div id="bg-preview-overlay" style="position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;background:#000;display:flex;align-items:center;justify-content:center;">
                <img src="${bg.path}" style="width:100%;height:100%;object-fit:cover;" alt="${bg.name}">
                <div style="position:absolute;bottom:40px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.6);font-size:14px;background:rgba(0,0,0,0.5);padding:8px 20px;border-radius:20px;pointer-events:none;">
                    <i class="fas fa-eye"></i> 预览: ${bg.name} — 点击任意处关闭
                </div>
            </div>
        `);
        
        $('body').append($overlay);
        
        $overlay.on('click', function() {
            $(this).fadeOut(300, function() {
                $(this).remove();
            });
        });
    }
},

    async loadBackgrounds() {
        try {
            const response = await fetch(this.configPath);
            if (!response.ok) {
                this.backgrounds = [{ id: 1, name: '默认背景', path: 'pictures/background.mp4', price: 0 }];
                return;
            }
            const text = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");
            const nodes = xmlDoc.getElementsByTagName('background');

            this.backgrounds = Array.from(nodes).map(node => ({
                id: node.getElementsByTagName('id')[0]?.textContent || '0',
                name: node.getElementsByTagName('name')[0]?.textContent || '未知背景',
                path: node.getElementsByTagName('path')[0]?.textContent || '',
                price: Number(node.getElementsByTagName('price')[0]?.textContent) || 0
            }));

            if (this.backgrounds.length === 0) {
                this.backgrounds = [{ id: 1, name: '默认背景', path: 'pictures/background.mp4', price: 0 }];
            }
        } catch (e) {
            this.backgrounds = [{ id: 1, name: '默认背景', path: 'pictures/background.mp4', price: 0 }];
        }
    },

    applyBackground(path) {
        const isVideo = path.endsWith('.mp4');

        $('#bg-video').remove();
        $('body').css({
            'background-image': 'none',
            'background-color': '#000'
        });

        if (isVideo) {
            const $video = $(`
                <video id="bg-video"
                    muted
                    autoplay
                    loop
                    playsinline
                    preload="metadata"
                    poster="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=">
                    <source src="${path}" type="video/mp4">
                </video>
            `);
            $('body').prepend($video);
            $video[0].muted = true;
            $video[0].volume = 0;
            
            setTimeout(() => {
                $('#bg-video')[0]?.play().catch(e => {});
            }, 100);
        } else {
            const bgUrl = `url('${path}')`;
            $('body').css({
                'background-image': bgUrl,
                'background-size': 'cover',
                'background-position': 'center',
                'background-repeat': 'no-repeat'
            });
        }

        localStorage.setItem(this.storageKey, path);
    },

    loadSavedBackground() {
        const savedPath = localStorage.getItem(this.storageKey);
        if (savedPath) {
            const bg = this.backgrounds.find(b => b.path === savedPath);
            if (bg && this.isBackgroundUnlocked(bg.id)) {
                this.applyBackground(savedPath);
                return;
            }
        }
        const defaultBg = this.backgrounds.find(b => Number(b.id) === 1);
        if (defaultBg) {
            this.applyBackground(defaultBg.path);
        }
    },

    openSelector() {
        if (this.backgrounds.length === 0) {
            if (window.showToast) {
                window.showToast('背景列表为空，请检查配置文件');
            }
            return;
        }

        this.currentIndex = 0;
        this.selectedIndex = 0;

        const savedPath = localStorage.getItem(this.storageKey);
        if (savedPath) {
            const idx = this.backgrounds.findIndex(bg => bg.path === savedPath);
            if (idx !== -1) {
                this.currentIndex = idx;
                this.selectedIndex = idx;
            }
        }

        this.renderPreview();
        EventManager.openModal('bg-select-modal');
    },

    renderPreview() {
        if (this.backgrounds.length === 0) return;

        const bg = this.backgrounds[this.currentIndex];
        if (!bg) return;

        const isVideo = bg.path.endsWith('.mp4');
        const $wrapper = $('.bg-preview-image-wrapper');

        if (!$wrapper.length) return;

        $wrapper.empty();

        const unlocked = this.isBackgroundUnlocked(bg.id);
        const lockOverlay = !unlocked ? `<div class="bg-lock-overlay"><i class="fas fa-lock"></i></div>` : '';

        if (isVideo) {
            const $video = $('<video></video>');
            $video.attr({
                'autoplay': '',
                'loop': '',
                'playsinline': '',
                'preload': 'metadata',
                'poster': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
            }).css({
                'width': '100%',
                'height': '100%',
                'object-fit': 'cover',
                'border-radius': '8px',
                'display': 'block'
            });

            const videoElement = $video[0];
            videoElement.muted = true;
            videoElement.defaultMuted = true;

            $video.attr('src', bg.path);
            $wrapper.append($video);

            if (lockOverlay) {
                $wrapper.append(lockOverlay);
            }

            videoElement.muted = true;
            videoElement.play().catch(err => {
                console.warn('视频预览播放失败:', err);
            });
        } else {
            const $img = $(`<img id="bg-preview-image" src="${bg.path}" alt="背景预览">`);
            $img.on('error', function() {
                $(this).attr('src', 'pictures/background.mp4');
            });
            $wrapper.append($img);
            if (lockOverlay) {
                $wrapper.append(lockOverlay);
            }
        }

        const priceInfo = unlocked
            ? `<span style="color:#4ade80;font-size:13px;"><i class="fas fa-check-circle"></i> 已解锁</span>`
            : `<span style="color:#f59e0b;font-size:13px;">价格: ${Utils.formatCurrency(bg.price)}</span>`;

        $('#bg-name-display').html(`${bg.name} &nbsp; ${priceInfo}`);

        const $previewBtn = $('#bg-preview-btn');
        $previewBtn.prop('disabled', false).css('opacity', '1');

        const $buyBtn = $('#bg-buy-btn');
        if (unlocked) {
            $buyBtn.prop('disabled', true).html('<i class="fas fa-check"></i> 已拥有').css('opacity', '0.5');
        } else {
            $buyBtn.prop('disabled', false).html(`<i class="fas fa-shopping-cart"></i> 购买`).css('opacity', '1');
        }

        const $indicators = $('#bg-indicators');
        $indicators.empty();

        this.backgrounds.forEach((_, index) => {
            const $dot = $(`<div class="carousel-indicator ${index === this.currentIndex ? 'active' : ''}"></div>`);
            $dot.on('click', () => {
                this.currentIndex = index;
                this.renderPreview();
            });
            $indicators.append($dot);
        });
    },

    confirmSelection() {
        const bg = this.backgrounds[this.currentIndex];
        if (!bg) {
            if (window.showToast) window.showToast('请选择一个背景');
            return;
        }

        if (!this.isBackgroundUnlocked(bg.id)) {
            if (window.showToast) window.showToast('该背景尚未解锁，请先购买');
            return;
        }

        this.selectedIndex = this.currentIndex;
        this.applyBackground(bg.path);
        EventManager.closeModal('bg-select-modal');

        if (window.showToast) window.showToast(`背景已切换为: ${bg.name}`);
    },

    buyCurrentBackground() {
        const bg = this.backgrounds[this.currentIndex];
        if (!bg) return;

        const result = this.purchaseBackground(bg.id);
        if (result.success) {
            this.renderPreview();
            if (window.showToast) window.showToast(result.message);
        } else {
            if (window.showToast) window.showToast(result.message);
        }
    },

    prev() {
        if (this.backgrounds.length === 0) return;
        this.currentIndex = (this.currentIndex - 1 + this.backgrounds.length) % this.backgrounds.length;
        this.renderPreview();
    },

    next() {
        if (this.backgrounds.length === 0) return;
        this.currentIndex = (this.currentIndex + 1) % this.backgrounds.length;
        this.renderPreview();
    },

    getCurrentBackground() {
        const savedPath = localStorage.getItem(this.storageKey);
        if (savedPath) {
            return this.backgrounds.find(bg => bg.path === savedPath) || this.backgrounds[0];
        }
        return this.backgrounds[0];
    },

    getAllBackgrounds() {
        return this.backgrounds;
    },

    getBackgroundCount() {
        return this.backgrounds.length;
    },

    isVideoBackground(path) {
        return path && path.endsWith('.mp4');
    }
};

    const TooltipManager = {
        _hideTimer: null,
        
        show(item, element) {
            const $tooltip = $('#item-tooltip');
            
            if (!item.searched) {
                this.hide();
                return;
            }
            
            if (this._hideTimer) {
                clearTimeout(this._hideTimer);
                this._hideTimer = null;
            }
            
            $('#tooltip-img').attr('src', item.image || '');
            $('#tooltip-name').text(item.name || '');
            $('#tooltip-desc').text(item.desc || '世界观内容待补充。');
            
            if (item.isCoin) {
                $('#tooltip-price').closest('.tooltip-price-row').hide();
            } else {
                $('#tooltip-price').text(Number(item.value || 0).toLocaleString());
                $('#tooltip-price').closest('.tooltip-price-row').show();
            }

            const rect = element.getBoundingClientRect();
            
            let left = rect.right + 8;
            let top = rect.top + (rect.height / 2) - 40;
            
            const tooltipWidth = 260;
            const tooltipHeight = 110;
            
            if (left + tooltipWidth > window.innerWidth) {
                left = rect.left - tooltipWidth - 8;
            }
            if (top < 5) top = 5;
            if (top + tooltipHeight > window.innerHeight) {
                top = window.innerHeight - tooltipHeight - 5;
            }

            $tooltip
                .removeClass('item-tooltip-hide')
                .addClass('item-tooltip-show')
                .css({
                    left: left + 'px',
                    top: top + 'px',
                    display: 'flex'
                });
            
            $tooltip.data('initialLeft', left);
            $tooltip.data('initialTop', top);
        },
        
        hide() {
            const $tooltip = $('#item-tooltip');
            if (!$tooltip.is(':visible')) return;
            
            $tooltip.removeClass('item-tooltip-show');
            $tooltip.addClass('item-tooltip-hide');
            
            this._hideTimer = setTimeout(() => {
                $tooltip.removeClass('item-tooltip-hide').hide();
                this._hideTimer = null;
            }, 130);
        },
        
        enableDrag() {
            const $tooltip = $('#item-tooltip');
            let isDragging = false;
            let startX, startY, originLeft, originTop;
            let longPressTimer = null;
            
            $tooltip.on('mousedown touchstart', function(e) {
                const touch = e.touches ? e.touches[0] : e;
                startX = touch.clientX;
                startY = touch.clientY;
                originLeft = parseInt($tooltip.css('left'));
                originTop = parseInt($tooltip.css('top'));
                
                longPressTimer = setTimeout(() => {
                    isDragging = true;
                    $tooltip.css('cursor', 'grabbing');
                    e.preventDefault();
                }, 550);
            });
            
            $(document).on('mousemove touchmove', function(e) {
                if (!isDragging) return;
                e.preventDefault();
                
                const touch = e.touches ? e.touches[0] : e;
                const dx = touch.clientX - startX;
                const dy = touch.clientY - startY;
                
                $tooltip.css({
                    left: (originLeft + dx) + 'px',
                    top: (originTop + dy) + 'px'
                });
            });
            
            $(document).on('mouseup touchend', function() {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
                
                if (isDragging) {
                    isDragging = false;
                    $tooltip.css('cursor', 'default');
                }            
            });
        }
    };

    const StatsManager = {
        loadAccumulatedStats() {
            try {
                const saved = localStorage.getItem(Config.storageKey);
                if (saved) {
                    const stats = JSON.parse(saved);
                    State.totalAccumulatedValue = stats.totalAccumulatedValue || 0;
                }
            } catch (e) {
                State.totalAccumulatedValue = 0;
            }
        },
        
        saveAccumulatedStats() {
            try {
                const stats = {
                    totalAccumulatedValue: State.totalAccumulatedValue
                };
                localStorage.setItem(Config.storageKey, JSON.stringify(stats));
            } catch (e) {}
        },
        
        updateAccumulatedValue(value) {
            State.totalAccumulatedValue += value;
            State.sessionAccumulatedValue += value;
            this.saveAccumulatedStats();
            this.updateAccumulatedValueDisplay();
        },
        
        updateAccumulatedValueDisplay() {
            const $accumulatedValue = $('#accumulated-value');
            if ($accumulatedValue.length) {
                $accumulatedValue.html(`<img src="images/柯恩币.png" alt="柯恩币" style="display: inline-block; vertical-align: middle; height: 1.2em; width: auto; margin-right: 2px;">${Utils.formatCurrency(State.totalAccumulatedValue)}`);
            }
            TitleManager.updateTitleDisplay();
        },
        
        resetSessionStats() {
            State.sessionAccumulatedValue = 0;
        }
    };

    const TitleManager = {
        getCurrentTitle() {
            const value = State.totalAccumulatedValue;
            const titles = Config.titles;
            let current = titles[0];
            for (let i = titles.length - 1; i >= 0; i--) {
                if (value >= titles[i].value) {
                    current = titles[i];
                    break;
                }
            }
            return current;
        },
        
        getNextTitle() {
            const value = State.totalAccumulatedValue;
            const titles = Config.titles;
            for (let i = 0; i < titles.length; i++) {
                if (value < titles[i].value) {
                    return titles[i];
                }
            }
            return null;
        },
        
        getAllTitles() {
            return Config.titles;
        },
        
        isUnlocked(titleValue) {
            return State.totalAccumulatedValue >= titleValue;
        },
        
        getProgress() {
            const current = this.getCurrentTitle();
            const next = this.getNextTitle();
            if (!next) return { current: current, next: null, progress: 1, currentValue: State.totalAccumulatedValue, nextValue: State.totalAccumulatedValue };
            
            const currentThreshold = current.value;
            const nextThreshold = next.value;
            const progressValue = State.totalAccumulatedValue - currentThreshold;
            const range = nextThreshold - currentThreshold;
            const progress = range > 0 ? Math.min(1, progressValue / range) : 1;
            
            return {
                current: current,
                next: next,
                progress: progress,
                currentValue: State.totalAccumulatedValue,
                nextValue: nextThreshold
            };
        },
        
        updateTitleDisplay() {
            const current = this.getCurrentTitle();
            const $titleEl = $('#profile-title');
            if ($titleEl.length) {
                $titleEl.text(current.name);
            }
        },
        
        renderTitleModal() {
            const current = this.getCurrentTitle();
            const next = this.getNextTitle();
            const progress = this.getProgress();
            
            $('#title-current-name').text(current.name);
            
            if (next) {
                const progressPercent = (progress.progress * 100).toFixed(1);
                $('#title-progress-bar').css('width', progressPercent + '%');
                $('#title-next-target').text(Utils.formatCurrency(next.value));
                $('#title-progress-text').text(`${Utils.formatCurrency(State.totalAccumulatedValue)} / ${Utils.formatCurrency(next.value)}`);
            } else {
                $('#title-progress-bar').css('width', '100%');
                $('#title-next-target').text('已最高段位');
                $('#title-progress-text').text('已达到最高段位');
            }
            
            const $list = $('#title-list');
            $list.empty();
            
            const titles = this.getAllTitles();
            titles.forEach((title, index) => {
                const unlocked = this.isUnlocked(title.value);
                const isCurrent = current.name === title.name;
                
                const $item = $(`
                    <div class="title-list-item ${unlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}">
                        <div class="title-item-icon">
                            <img src="${title.icon}" alt="${title.name}" 
                                 style="width:32px;height:32px;object-fit:contain;display:block;margin:0 auto;"
                                 onerror="this.onerror=null;this.style.display='none';this.parentNode.innerHTML='<span style=\\'font-size:24px;color:#666;\\'>?</span>';">
                        </div>
                        <div class="title-item-info">
                            <div class="title-item-name">${title.name}</div>
                            <div class="title-item-desc">${title.description}</div>
                            <div class="title-item-requirement">需要累计价值达到: ${Utils.formatCurrency(title.value).replace(/\.\d+/, '')}</div>
                        </div>
                        <div class="title-item-status">
                            ${isCurrent ? '<span class="title-status-badge current-badge">当前段位</span>' : (unlocked ? '<span class="title-status-badge unlocked-badge">已达到目标</span>' : '<span class="title-status-badge locked-badge">未达到目标</span>')}
                        </div>
                    </div>
                `);
                
                $list.append($item);
            });
        }
    };

    window.Utils = {
        playAudio(audioId, options = {}) {
            if (!Config.game.sound || State.isPaused) return;
            const $audio = $(`#${audioId}`);
            if (!$audio.length) return;
            try {
                const audio = $audio[0];
                if (!audio.paused) {
                    audio.pause();
                    audio.currentTime = 0;
                }
                audio.currentTime = _.get(options, 'startTime', 0);
                audio.volume = _.get(options, 'volume', 0.5);
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => {});
                }
            } catch (e) {}
        },
        
        formatCurrency(value) {
            if (value < 1000) {
                return `${value.toFixed(2)}`;
            } else if (value < 100000) {
                return `${(value / 1000).toFixed(2)}k`;
            } else {
                return `${(value / 1000000).toFixed(2)}m`;
            }
        },

        getRarityColor(rarity) {
            const colors = {
                red: '#FE806C',
                orange: '#FE806C',
                gold: '#f39c12',
                purple: '#9b59b6',
                white: '#cccccc'
            };
            return _.get(colors, rarity, colors.white);
        },
        createElement(tag, options = {}) {
            const $element = $(`<${tag}>`);
            if (options.className) $element.addClass(options.className);
            if (options.textContent !== undefined) $element.text(options.textContent);
            if (options.innerHTML !== undefined) $element.html(options.innerHTML);
            if (options.style) $element.css(options.style);
            if (options.attributes) {
                _.each(options.attributes, (value, key) => {
                    $element.attr(key, value);
                });
            }
            if (options.dataset) {
                _.each(options.dataset, (value, key) => {
                    $element.data(key, value);
                });
            }
            if (options.on) {
                _.each(options.on, (handler, event) => {
                    $element.on(event, handler);
                });
            }
            if (options.click) $element.click(options.click);
            return $element;
        }
    };

    function parseAccumulatedValue(str) {
        str = str.trim().toUpperCase();
        if (str.endsWith('K')) {
            return parseFloat(str.slice(0, -1)) * 1000;
        } else if (str.endsWith('M')) {
            return parseFloat(str.slice(0, -1)) * 1000000;
        } else {
            return parseFloat(str);
        }
    }

    const SoundManager = {
        audioPool: [],
        specialAudioPool: [],
        
        initAudioPool() {
            let $poolContainer = $('#item-sound-pool');
            if (!$poolContainer.length) {
                $poolContainer = Utils.createElement('div', {
                    id: 'item-sound-pool',
                    style: { display: 'none' }
                });
                $('body').append($poolContainer);
            }
            $poolContainer.empty();
            
            this.audioPool = _.times(8, () => {
                const $audio = Utils.createElement('audio', {
                    attributes: { 
                        preload: 'auto',
                        type: 'audio/mpeg'
                    },
                    style: { display: 'none' }
                });
                $poolContainer.append($audio);
                return $audio[0];
            });
            
            this.specialAudioPool = _.filter([
                document.getElementById('open-safe-audio'),
                document.getElementById('reset-game-audio'),
                document.getElementById('click-audio'),
                document.getElementById('special-audio-1'),
                document.getElementById('special-audio-2'),
                document.getElementById('special-audio-3'),
                document.getElementById('special-audio-4')
            ]);
        },
        
        getAvailableAudio() {
            return _.find(this.audioPool, audio => 
                audio.paused || (audio.ended && !audio.src)
            );
        },
        
        playItemSound(soundUrl, volume = 0.5) {
            if (!Config.game.sound || !Config.game.itemSound || !soundUrl || _.trim(soundUrl) === '' || State.isPaused) {
                return;
            }
            
            try {
                const audio = this.getAvailableAudio();
                if (!audio) {
                    return;
                }
                
                audio.pause();
                audio.currentTime = 0;
                audio.volume = volume;
                
                const onLoaded = () => {
                    audio.removeEventListener('canplaythrough', onLoaded);
                    audio.play().catch(() => {});
                };
                
                const onError = () => {
                    audio.removeEventListener('error', onError);
                    audio.src = '';
                };
                
                audio.addEventListener('canplaythrough', onLoaded, { once: true });
                audio.addEventListener('error', onError, { once: true });
                
                audio.src = soundUrl;
                
            } catch (e) {}
        },
        
        playSpecialSoundRandom() {
            if (!Config.game.sound || State.isPaused) return;
            const randomNum = _.random(1, 4);
            const $audio = $(`#special-audio-${randomNum}`);
            if (!$audio.length) {
                this.playSpecialSound1();
                return;
            }
            try {
                const audio = $audio[0];
                audio.currentTime = 0;
                audio.volume = 0.5;
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => {
                        this.playSpecialSound1();
                    });
                }
            } catch (e) {
                this.playSpecialSound1();
            }
        },
        
        playSpecialSound1() {
            if (!Config.game.sound || State.isPaused) return;
            const $audio = $('#special-audio-1');
            if (!$audio.length) {
                return;
            }
            try {
                const audio = $audio[0];
                audio.currentTime = 0;
                audio.volume = 0.5;
                audio.play().catch(() => {});
            } catch (e) {}
        },
        
        pauseAllSounds() {
            _.each(this.audioPool, audio => {
                if (!audio.paused) {
                    audio.pause();
                }
            });
            
            _.each(this.specialAudioPool, audio => {
                if (!audio.paused) {
                    audio.pause();
                }
            });
        },
        
        resumeAllSounds() {
            if (State.isPaused) return;
            
            _.each(this.audioPool, audio => {
                if (audio.paused && audio.currentTime > 0) {
                    audio.play().catch(() => {});
                }
            });
        },
        
        clearAllSounds() {
            _.each(this.audioPool, audio => {
                audio.pause();
                audio.currentTime = 0;
                audio.src = '';
            });
            
            _.each(this.specialAudioPool, audio => {
                audio.pause();
                audio.currentTime = 0;
            });
        },
        
        cleanupStalledAudio() {
            _.each(this.audioPool, (audio) => {
                if (audio.src && !audio.paused && audio.currentTime > 0) {
                    const currentTime = audio.currentTime;
                    _.delay(() => {
                        if (Math.abs(audio.currentTime - currentTime) < 0.1) {
                            audio.pause();
                            audio.currentTime = 0;
                            audio.src = '';
                        }
                    }, 5000);
                }
            });
        },
        
        startCleanupInterval() {
            setInterval(() => this.cleanupStalledAudio(), 9000);
        },
        
        clearCache() {
            this.clearAllSounds();
        }
    };

    const DOMBuilder = {
        createInventoryItem(item) {
            const rarityColor = Utils.getRarityColor(item.rarity);
            const $itemElement = Utils.createElement('div', {
                className: 'inventory-item',
                style: { borderLeftColor: rarityColor }
            });
            const $icon = Utils.createElement('div', {
                className: 'inventory-icon',
                style: { color: rarityColor }
            });
            const $info = Utils.createElement('div', { className: 'inventory-info' });
            const $name = Utils.createElement('div', { 
                className: 'inventory-name',
                textContent: item.name,
                style: { color: rarityColor }
            });
            const $details = Utils.createElement('div', { className: 'inventory-details' });
            const $value = Utils.createElement('div', { 
                className: 'inventory-value',
                innerHTML: `<img src="images/柯恩币.png" alt="柯恩币" style="display: inline-block; vertical-align: middle; height: 1.2em; width: auto; margin-right: 2px;">${Utils.formatCurrency(item.value)}`
            });
            const $size = Utils.createElement('div', { className: 'inventory-size' });
            
            $details.append($value, $size);
            $info.append($name, $details);
            $itemElement.append($icon, $info);
            return $itemElement;
        },
        
        createItemElement(item, cellWidth, cellHeight) {
            const $element = Utils.createElement('div', {
                className: item.searched ? `item item-${item.rarity}` : 'item item-white',
                dataset: { id: item.id }
            });

            const left = item.col * cellWidth;
            const top = item.row * cellHeight;
            const gridWidth = item.width * cellWidth;
            const gridHeight = item.height * cellHeight;
            const actualWidth = _.max([10, gridWidth - Config.item.spacing * 2]); 
            const actualHeight = _.max([10, gridHeight - Config.item.spacing * 2]);
            const itemLeft = left + (gridWidth - actualWidth)/ 2 - 1.5;
            const itemTop = top + (gridHeight - actualHeight)/ 2 - 0.5;
            
            $element.css({
                left: `${Math.floor(itemLeft)}px`,
                top: `${Math.floor(itemTop)}px`,
                width: `${Math.floor(actualWidth)}px`,
                height: `${Math.floor(actualHeight)}px`,
                fontSize: `${Config.item.fontSize}px`,
                opacity: 1
            });
            
            return $element;
        },
        
        createItemContent(item) {
            const $container = Utils.createElement('div', {
                className: 'item-content-container',
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    position: 'relative'
                }
            });
            
            const $imageContainer = Utils.createElement('div', {
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    width: '100%'
                }
            });
            
            if (item.image && _.trim(item.image) !== '' && item.image !== 'undefined') {
                const $image = Utils.createElement('img', {
                    className: 'item-image',
                    attributes: { 
                        src: item.image,
                        alt: item.name
                    }
                });
                const gridScale = this.getImageScaleByGrid(item);
                const imageSize = Config.item.imgBase * gridScale;
                $image.css({
                    width: `${imageSize}px`,
                    height: `${imageSize}px`,
                    objectFit: 'contain',
                    maxWidth: '100%',
                    maxHeight: '100%'
                });
                $image.on('error', function() {
                    $(this).hide();
                    $imageContainer.empty();
                });
                $imageContainer.append($image);
            } else {
                $imageContainer.empty();
            }
            
            $container.append($imageContainer);
            
            const $name = Utils.createElement('div', {
                className: 'item-name',
                textContent: item.name,
                style: {
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    fontWeight: 'bold',
                    textAlign: 'right',
                    color: '#C0C0C0',
                    padding: '1px 3px',
                    fontSize: '0.7em',
                    textShadow: '0 0 2px black, 0 0 2px black, 0 0 2px black',
                    zIndex: '3',
                    maxWidth: '90%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'block'
                }
            });
            $container.append($name);
            
            if (item.isCoin) {
                const $amount = Utils.createElement('div', {
                    className: 'coin-amount',
                    textContent: item.value.toLocaleString('en-US'),
                    style: {
                        position: 'absolute',
                        bottom: '2px',
                        right: '2px',
                        background: 'transparent',
                        color: '#C0C0C0',
                        padding: '1px 3px',
                        fontWeight: 'bold',
                        fontSize: '0.7em',
                        textShadow: '0 0 2px black, 0 0 2px black, 0 0 2px black',
                        zIndex: '3'
                    }
                });
                $container.append($amount);
            }
            
            return $container;
        },
        
        createSearchingOverlay(item, animate, isFirstWaiting = false) {
            let text = '';
            if (animate) {
                text = '';
            } else if (isFirstWaiting) {
                text = '';
            }
            
            if (State.isPaused) {
                return Utils.createElement('div', {
                    className: 'searching-overlay',
                    innerHTML: `
                        <div class="searching-icon-container"></div>
                        <div class="searching-text">${text}</div>
                    `
                });
            }
            
            return Utils.createElement('div', {
                className: 'searching-overlay',
                innerHTML: `
                    <div class="searching-icon-container">
                        <div class="searching-icon ${animate ? 'searching-animate' : ''}">
                            <i class="fas fa-search"></i>
                        </div>
                    </div>
                    <div class="searching-text">${text}</div>
                `
            });
        },
        
        getImageScaleByGrid(item) {
            const gridCells = item.width * item.height;
            const scaleFactor = 1 + (gridCells - 1) * Config.item.multiplier;
            return _.clamp(
                scaleFactor,
                Config.item.minScale,
                Config.item.maxScale
            );
        }
    };

    const ItemControlManager = {
        PASSWORD: 'hefunadminitem',
        
        getDisabledItems() {
            try {
                const data = localStorage.getItem('disabled_items_list');
                return data ? JSON.parse(data) : [];
            } catch(e) {
                return [];
            }
        },
        
        saveDisabledItems(list) {
            localStorage.setItem('disabled_items_list', JSON.stringify(list));
        },
        
        isItemDisabled(itemId) {
            return this.getDisabledItems().includes(itemId);
        },
        
        toggleItem(itemId, disabled) {
            let list = this.getDisabledItems();
            if (disabled) {
                if (!list.includes(itemId)) {
                    list.push(itemId);
                }
            } else {
                list = list.filter(id => id !== itemId);
            }
            this.saveDisabledItems(list);
        },
        
        disableAll() {
            const ids = allItemsConfig.map(item => item.id);
            ids.push(-1);
            this.saveDisabledItems(ids);
        },
        
        enableAll() {
            this.saveDisabledItems([]);
        },

        setAccumulatedValue(value) {
            State.totalAccumulatedValue = value;
            State.sessionAccumulatedValue = value;
            this.saveAccumulatedValue(value);
            StatsManager.updateAccumulatedValueDisplay();
            return true;
        },

        getAccumulatedValue() {
            return State.totalAccumulatedValue;
        },

        saveAccumulatedValue(value) {
            try {
                const stats = JSON.parse(localStorage.getItem(Config.storageKey) || '{}');
                stats.totalAccumulatedValue = value;
                localStorage.setItem(Config.storageKey, JSON.stringify(stats));
            } catch (e) {}
        },
        
        renderItemList(searchTerm = '', rarityFilter = 'all') {
            const $list = $('#item-control-list');
            $list.empty();
            
            let items = [...allItemsConfig];
            
            const coinItem = {
                id: 50001,
                name: '柯恩币',
                width: 1,
                height: 1,
                value: 1000,
                image: 'images/柯恩币.png',
                rarity: 'white',
                weight: 100
            };
            
            const hasCoin = items.some(item => item.name === '柯恩币' && item.rarity === 'white');
            if (!hasCoin) {
                items.unshift(coinItem);
            }
            
            if (rarityFilter !== 'all') {
                items = items.filter(item => item.rarity === rarityFilter);
            }
            
            if (searchTerm.trim()) {
                const term = searchTerm.trim().toLowerCase();
                items = items.filter(item => {
                    if (item.name.toLowerCase().includes(term)) return true;
                    if (item.id.toString() === term) return true;
                    if (item.rarity.toLowerCase().includes(term)) return true;
                    const formatStr = `${item.rarity} · ${item.width}x${item.height} · ID: ${item.id}`.toLowerCase();
                    if (formatStr.includes(term)) return true;
                    if (`${item.width}x${item.height}`.includes(term)) return true;
                    return false;
                });
            }
            
            const rarityOrder = { red: 0, orange: 1, gold: 2, purple: 3, white: 4 };
            items.sort((a, b) => (rarityOrder[a.rarity] || 99) - (rarityOrder[b.rarity] || 99));
            
            if (items.length === 0) {
                $list.html('<div style="text-align:center;padding:60px 20px;color:#64748b;font-size:14px;"><i class="fas fa-search" style="font-size:32px;display:block;margin-bottom:12px;color:#475569;"></i>没有找到匹配的物品</div>');
                return;
            }
            
            const disabledIds = this.getDisabledItems();
            
            items.forEach(item => {
                const isDisabled = disabledIds.includes(item.id);
                const rarityColors = {
                    red: '#FE806C',
                    orange: '#FE806C',
                    gold: '#f39c12',
                    purple: '#9b59b6',
                    white: '#cccccc'
                };
                const color = rarityColors[item.rarity] || '#cccccc';
                
                const $row = $(`
                    <div style="display:flex;align-items:center;padding:8px 12px;background:rgba(255,255,255,0.02);border-radius:8px;gap:10px;transition:all 0.2s;opacity:${isDisabled ? 0.4 : 1};border:1px solid ${isDisabled ? 'rgba(255,255,255,0.03)' : 'transparent'};">
                        <div style="width:38px;height:38px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:6px;overflow:hidden;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.05);">
                            ${item.image && item.image !== 'undefined' && item.image !== '' 
                                ? `<img src="${item.image}" alt="${item.name}" style="width:100%;height:100%;object-fit:contain;">`
                                : `<span style="color:${color};font-size:16px;">?</span>`
                            }
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="color:${color};font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.name}</div>
                            <div style="color:#64748b;font-size:11px;">${item.rarity} · ${item.width}x${item.height} · ID: ${item.id}</div>
                        </div>
                        <label class="item-toggle-switch">
                            <input type="checkbox" class="item-toggle" data-id="${item.id}" ${isDisabled ? '' : 'checked'}>
                            <span class="item-toggle-slider" style="background:${isDisabled ? '#374151' : '#2563eb'};box-shadow:${isDisabled ? 'none' : '0 0 6px rgba(37,99,235,0.4)'};">
                                <span class="item-toggle-knob" style="left:${isDisabled ? '3px' : '23px'};"></span>
                            </span>
                        </label>
                    </div>
                `);
                
                $row.find('.item-toggle').on('change', function() {
                    const itemId = parseInt($(this).data('id'));
                    const disabled = !$(this).is(':checked');
                    ItemControlManager.toggleItem(itemId, disabled);
                    $row.css('opacity', disabled ? 0.4 : 1);
                    $row.css('border-color', disabled ? 'rgba(255,255,255,0.03)' : 'transparent');
                    const $slider = $row.find('.item-toggle-slider');
                    const $knob = $row.find('.item-toggle-knob');
                    $slider.css({
                        'background': disabled ? '#374151' : '#2563eb',
                        'box-shadow': disabled ? 'none' : '0 0 6px rgba(37,99,235,0.4)'
                    });
                    $knob.css({
                        'left': disabled ? '3px' : '23px'
                    });
                });
                
                $list.append($row);
            });
        }
    };

    const GameCore = {
        async loadItemsFromXML() {
            try {
                const response = await fetch('xml/items.xml');
                if (!response.ok) {
                    return this.getDefaultItems();
                }
                const text = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(text, "text/xml");
                const nodes = xmlDoc.getElementsByTagName('item');
                
                const items = _.chain(nodes)
                    .map((node) => {
                        const getText = (tag) => _.get(node.getElementsByTagName(tag), '[0].textContent', '');
                        const item = {
                            id: _.parseInt(getText('id')),
                            name: getText('name'),
                            width: _.parseInt(getText('width')),
                            height: _.parseInt(getText('height')),
                            value: _.parseInt(getText('value') || "0"),
                            image: getText('image'),
                            rarity: getText('rarity') || "white",
                            sound: getText('sound'),
                            desc: getText('desc'),
                            isSample: getText('isSample') === '1'
                        };
                        
                        item.value = this.normalizeValue(item.value);
                        item.searchTime = _.get(Config.searchTimes, item.rarity, Config.searchTimes.purple);
                        const xmlWeight = getText('weight');
                        item.weight = xmlWeight !== '' ? _.parseInt(xmlWeight) : this.calculateItemWeight(item.value);
                        
                        return item.rarity !== 'white' ? item : null;
                    })
                    .compact()
                    .value();
                    
                return items;
            } catch (e) {
                return this.getDefaultItems();
            }
        },
        
        normalizeValue(value) {
            return _.clamp(value, Config.valueRange.min, Config.valueRange.max);
        },
        
        calculateItemWeight(value) {
            const normalizedValue = this.normalizeValue(value);
            const weight = Config.valueWeight.baseWeight * Math.exp(-Config.valueWeight.decayFactor * normalizedValue);
            return _.max([Config.valueWeight.minWeight, weight]);
        },
        
        getDefaultItems() {
            return [];
        },
        
        getRandomItemByRarity(rarity) {
            const disabledIds = ItemControlManager.getDisabledItems();
            const itemsOfRarity = _.filter(allItemsConfig, { rarity }).filter(item => 
                !disabledIds.includes(item.id)
            );
            if (_.isEmpty(itemsOfRarity)) return null;
            
            const totalWeight = _.sumBy(itemsOfRarity, 'weight');
            let randomWeight = Math.random() * totalWeight;
            
            return _.find(itemsOfRarity, item => {
                randomWeight -= item.weight;
                return randomWeight <= 0;
            });
        },
        
        getRandomItem() {
            if (_.isEmpty(allItemsConfig)) return null;
            
            const roll = Math.random() * 100;
            
            if (roll < Config.spawn.red) {
                const redItem = this.getRandomItemByRarity('red');
                if (redItem) return _.cloneDeep(redItem);
            }
            
            if (roll < Config.spawn.red + Config.spawn.orange) {
                const orangeItem = this.getRandomItemByRarity('orange');
                if (orangeItem) return _.cloneDeep(orangeItem);
            }
            
            if (roll < Config.spawn.red + Config.spawn.orange + Config.spawn.gold) {
                const goldItem = this.getRandomItemByRarity('gold');
                if (goldItem) return _.cloneDeep(goldItem);
            }
            
            const purpleItem = this.getRandomItemByRarity('purple');
            if (purpleItem) return _.cloneDeep(purpleItem);
            
            return this.getWeightedRandomItem();
        },
        
        getWeightedRandomItem() {
            const disabledIds = ItemControlManager.getDisabledItems();
            const availableItems = _.filter(allItemsConfig, item => !disabledIds.includes(item.id));
            
            if (_.isEmpty(availableItems)) return null;
            
            const totalWeight = _.sumBy(availableItems, 'weight');
            let randomWeight = Math.random() * totalWeight;
            
            const item = _.find(availableItems, item => {
                randomWeight -= item.weight;
                return randomWeight <= 0;
            });
            
            return _.cloneDeep(item || _.sample(availableItems));
        },
        
        canPlaceItem(item, row, col, grid) {
            if (row + item.height > Config.grid.rows || col + item.width > Config.grid.cols) return false;
            
            for (let r = row; r < row + item.height; r++) {
                for (let c = col; c < col + item.width; c++) {
                    if (grid[r][c] !== 0) return false;
                }
            }
            return true;
        },
        
        placeItem(item, row, col, grid) {
            _.times(item.height, r => {
                _.times(item.width, c => {
                    grid[row + r][col + c] = item.id;
                });
            });
            
            return _.assign(item, { row, col });
        },
        
        tryPlaceItem(item, grid) {
            for (let r = 0; r < Config.grid.rows; r++) {
                for (let c = 0; c < Config.grid.cols; c++) {
                    if (this.canPlaceItem(item, r, c, grid)) {
                        return this.placeItem(item, r, c, grid);
                    }
                }
            }
            return null;
        },
        
        createSearchQueue() {
            State.searchQueue = _.chain(State.items)
                .map(item => _.cloneDeep(item))
                .sortBy(['col', 'row'])
                .value();
        }
    };

    const UIManager = {
        updateResetButtonState() {
            const $resetBtn = $('#reset-btn');
            const hasItems = State.items.length > 0 || State.inventory.length > 0;
            
            if (hasItems) {
                $resetBtn
                    .prop('disabled', false)
                    .removeClass('disabled')
                    .css({
                        'opacity': '1',
                        'cursor': 'pointer',
                        'background': 'rgba(255, 255, 255, 0.1)',
                        'border': '1px solid rgba(255, 255, 255, 0.2)',
                        'color': 'white'
                    });
            } else {
                $resetBtn
                    .prop('disabled', true)
                    .addClass('disabled')
                    .css({
                        'opacity': '0.5',
                        'cursor': 'not-allowed',
                        'background': 'rgba(255, 255, 255, 0.05)',
                        'border': '1px solid rgba(255, 255, 255, 0.1)',
                        'color': 'rgba(255, 255, 255, 0.5)'
                    });
            }
        },
        
        updatePauseButtonState() {
            const $pauseBtn = $('#pause-search-btn');
            if (State.isSearching) {
                $pauseBtn
                    .prop('disabled', false)
                    .removeClass('disabled')
                    .css({
                        'opacity': '1',
                        'cursor': 'pointer',
                        'background': 'rgba(255, 255, 255, 0.1)',
                        'border': '1px solid rgba(255, 255, 255, 0.2)',
                        'color': 'white'
                    });
            } else {
                $pauseBtn
                    .prop('disabled', true)
                    .addClass('disabled')
                    .css({
                        'opacity': '0.5',
                        'cursor': 'not-allowed',
                        'background': 'rgba(255, 255, 255, 0.05)',
                        'border': '1px solid rgba(255, 255, 255, 0.1)',
                        'color': 'rgba(255, 255, 255, 0.5)'
                    });
            }
        },
        
        updateInventory() {
            const $inventoryList = $('#inventory-list');
            if (_.isEmpty(State.inventory)) {
                $inventoryList.html('<div class="inventory-empty">点击"打开保险"开始搜索物品</div>');
                return;
            }
            $inventoryList.empty();
            _.each(State.inventory, item => {
                $inventoryList.append(DOMBuilder.createInventoryItem(item));
            });
            
            this.updateResetButtonState();
        },
        
        updateStats() {
            const updates = {
                '#total-value': `<img src="images/柯恩币.png" alt="柯恩币" style="display: inline-block; vertical-align: middle; height: 1.2em; width: auto; margin-right: 2px;">${Utils.formatCurrency(State.totalValue)}`,
                '#highest-value': `<img src="images/柯恩币.png" alt="柯恩币" style="display: inline-block; vertical-align: middle; height: 1.2em; width: auto; margin-right: 2px;">${Utils.formatCurrency(State.highestValue)}`
            };

            _.each(updates, (value, selector) => {
                $(selector).html(value);
            });

            this.updateResetButtonState();
        },
        
        renderAllItems() {
            const $safeGrid = $('#safe-grid');
            $safeGrid.find('.item').remove();
            $safeGrid.find('.grid-cell').removeClass('searching searched');
            
            const cellWidth = Config.grid.width / Config.grid.cols;
            const cellHeight = Config.grid.height / Config.grid.rows;
            
            const nextItem = State.searchQueue.length > 0 ? State.searchQueue[0] : null;
            
            _.each(State.items, item => {
                const $itemElement = DOMBuilder.createItemElement(item, cellWidth, cellHeight);
                $safeGrid.append($itemElement);
                this.markGridCells(item);
                
                if (item.searched) {
                    this.showItemContent($itemElement, item);
                } else if (State.currentSearch && State.currentSearch.id === item.id) {
                    if (State.isSearching) {
                        this.showSearchingOverlay($itemElement, item, !State.isPaused, false);
                    } else {
                        this.showSearchingOverlay($itemElement, item, false, false);
                    }
                } else if (nextItem && item.id === nextItem.id) {
                    this.showSearchingOverlay($itemElement, item, false, true);
                } else {
                    this.showWaitingCover($itemElement);
                }
            });
            
            this.updateResetButtonState();
        },
        
        markGridCells(item) {
            _.times(item.height, r => {
                _.times(item.width, c => {
                    const $cell = $(`.grid-cell[data-row="${item.row + r}"][data-col="${item.col + c}"]`);
                    if ($cell.length) {
                        if (item.searched) {
                            $cell.addClass('searched');
                        } else if (State.currentSearch && State.currentSearch.id === item.id && State.isSearching) {
                            if (State.isPaused) {
                                $cell.removeClass('searching');
                            } else {
                                $cell.addClass('searching');
                            }
                        } else {
                            $cell.removeClass('searching');
                        }
                    }
                });
            });
        },
        
        showItemContent($element, item) {
            $element.addClass('searched').empty();
            const $content = DOMBuilder.createItemContent(item);
            $element.append($content);
            
            if (item.isFreshSearch) {
                const $itemImage = $content.find('.item-image');
                if ($itemImage.length) {
                    $itemImage.removeClass('icon-reveal-quick');
                    setTimeout(() => {
                        $itemImage.addClass('icon-reveal-quick');
                        $itemImage.on('animationend', function() {
                            $(this).removeClass('icon-reveal-quick');
                        }, { once: true });
                    }, 10);
                }
                delete item.isFreshSearch;
            }
            
            this.updateResetButtonState();
        },
        
        showSearchingOverlay($element, item, animate) {
            $element.empty().append(DOMBuilder.createSearchingOverlay(item, animate));
        },
        
        showWaitingCover($element) {
            $element.removeClass('searched').empty();
            $element.append(Utils.createElement('div', {
                className: 'searching-overlay'
            }));
        },
        
        createGridCells() {
            const $safeGrid = $('#safe-grid');
            $safeGrid.empty().css({
                gridTemplateColumns: `repeat(${Config.grid.cols}, 1fr)`,
                gridTemplateRows: `repeat(${Config.grid.rows}, 1fr)`,
                width: `${Config.grid.width}px`,
                height: `${Config.grid.height}px`
            });
            
            _.times(Config.grid.rows, row => {
                _.times(Config.grid.cols, col => {
                    const $cell = Utils.createElement('div', {
                        className: 'grid-cell',
                        dataset: { row, col }
                    });
                    $safeGrid.append($cell);
                });
            });
            
            this.updateResetButtonState();
        }
    };

    const GameController = {
openSafe() {
    if (State.isOpenSafeBtnDisabled) return;
    State.isOpenSafeBtnDisabled = true;
    
    const $openButton = $('#open-safe-btn');
    $openButton.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> 生成中...');
    
    Utils.playAudio('open-safe-audio', { volume: 0.5 });
    this.resetGameState();
    
    State.grid = _.times(Config.grid.rows, () => _.times(Config.grid.cols, () => 0));
    
    let itemId = 1;
    const items = [];
    
    const coinDisabled = ItemControlManager.isItemDisabled(-1);
    
    if (!coinDisabled) {
        const coinStackCount = Math.random() < 0.5 ? 1 : 3;
        
        for (let i = 0; i < coinStackCount; i++) {
            const value = _.random(Config.coin.min, Config.coin.max);
            const coinItem = {
                name: "柯恩币",
                width: 1,
                height: 1,
                value: value,
                image: "images/柯恩币.png",
                rarity: "white",
                searchTime: 0.25,
                id: itemId++,
                row: 0,
                col: i,
                isCoin: true,
                sound: "audio/items/柯恩币.mp3",
                desc: '由卡莫纳官方发行的货币，由于其与特维拉官方货币的锚定，市价坚挺，是市场上的硬通货。'
            };
            if (GameCore.canPlaceItem(coinItem, 0, i, State.grid)) {
                GameCore.placeItem(coinItem, 0, i, State.grid);
                items.push(coinItem);
            }
        }
    }
    
    const disabledPurpleIds = ItemControlManager.getDisabledItems();
    const purpleItems = _.filter(allItemsConfig, item => 
        item.rarity === 'purple' && !disabledPurpleIds.includes(item.id)
    );
    
    if (!_.isEmpty(purpleItems)) {
        const purpleItemCount = _.random(Config.purpleSpawn.min, Config.purpleSpawn.max);
        _.times(purpleItemCount, () => {
            const purpleItem = _.cloneDeep(_.sample(purpleItems));
            purpleItem.id = itemId++;
            const placedItem = GameCore.tryPlaceItem(purpleItem, State.grid);
            if (placedItem) {
                items.push(placedItem);
            }
        });
    }
    
    const highQualityItems = _.filter(allItemsConfig, item => 
        _.includes(['red', 'orange', 'gold'], item.rarity) &&
        !disabledPurpleIds.includes(item.id)
    );
    
    if (!_.isEmpty(highQualityItems)) {
        const hqCount = _.random(1, 4);
        _.times(hqCount, () => {
            const hqItem = GameCore.getWeightedRandomItem();
            if (hqItem && hqItem.rarity !== 'purple') {
                hqItem.id = itemId++;
                const placedItem = GameCore.tryPlaceItem(hqItem, State.grid);
                if (placedItem) {
                    items.push(placedItem);
                }
            }
        });
    }
    
    const placedCells = _.sumBy(items, item => item.width * item.height);
    const totalCells = Config.grid.rows * Config.grid.cols;
    const remainingCells = totalCells - placedCells;
    
    if (remainingCells > 0) {
        const maxAttempts = 120;
        let attempts = 0;
        
        while (attempts < maxAttempts && placedCells < totalCells) {
            const randomItem = GameCore.getRandomItem();
            if (randomItem) {
                randomItem.id = itemId++;
                const placedItem = GameCore.tryPlaceItem(randomItem, State.grid);
                if (placedItem) {
                    items.push(placedItem);
                    break;
                }
            }
            attempts++;
        }
    }
    
    if (_.isEmpty(items)) {
        State.isOpenSafeBtnDisabled = false;
        $openButton.prop('disabled', false).html('<i class="fas fa-hand-pointer"></i> 打开保险');
        if (window.showToast) window.showToast('All items have been disabled and cannot be generated');
        return;
    }
    
    State.items = items;
    GameCore.createSearchQueue();
    UIManager.renderAllItems();
    UIManager.updateStats();
    UIManager.updateInventory();
    State.isFirstOpen = false;
    
    $openButton.html('<i class="fas fa-hand-pointer"></i> 打开保险');
    
    setTimeout(() => {
        State.currentSearch = _.cloneDeep(_.first(State.searchQueue));
        State.isSearching = true;
        State.isPaused = false;
        State.currentSearchTime = State.currentSearch.searchTime;
        State.pauseElapsed = 0;
        
        UIManager.updatePauseButtonState();
        UIManager.renderAllItems();
        this.startSearchTimer();
    }, 990);
},
        
        startSearch() {
            if (State.isSearching || _.isEmpty(State.searchQueue)) return;
            
            State.currentSearch = _.cloneDeep(_.first(State.searchQueue));
            State.isSearching = true;
            State.isPaused = false;
            State.currentSearchTime = State.currentSearch.searchTime;
            State.pauseElapsed = 0;
            
            UIManager.updatePauseButtonState();
            UIManager.renderAllItems();
            this.startSearchTimer();
        },
        
        startSearchTimer() {
            if (State.searchTimer) cancelAnimationFrame(State.searchTimer);
            
            let startTime = Date.now();
            
            const updateTimer = () => {
                if (State.isPaused) {
                    startTime = Date.now() - State.pauseElapsed;
                    return;
                }
                
                const elapsed = (Date.now() - startTime) / 1000;
                State.pauseElapsed = elapsed;
                const remainingTime = _.max([0, State.currentSearchTime - elapsed]);
                
                if (remainingTime <= 0) {
                    this.completeSearch();
                } else {
                    State.searchTimer = requestAnimationFrame(updateTimer);
                }
            };
            
            State.searchTimer = requestAnimationFrame(updateTimer);
        },
        
        toggleSearchPause() {
            if (!State.isSearching) return;
            
            State.isPaused = !State.isPaused;
            
            const $pauseBtn = $('#pause-search-btn');
            if (State.isPaused) {
                $pauseBtn.html('<i class="fas fa-play"></i> 继续搜索');
                SoundManager.pauseAllSounds();
                if (State.searchTimer) {
                    cancelAnimationFrame(State.searchTimer);
                    State.searchTimer = null;
                }
            } else {
                $pauseBtn.html('<i class="fas fa-pause"></i> 暂停搜索');
                SoundManager.resumeAllSounds();
                this.startSearchTimer();
            }
            
            UIManager.updatePauseButtonState();
            UIManager.renderAllItems();
        },
        
        completeSearch() {
            if (State.searchTimer) {
                cancelAnimationFrame(State.searchTimer);
                State.searchTimer = null;
            }
            
            const itemIndex = _.findIndex(State.items, { id: State.currentSearch.id });
            if (itemIndex !== -1) {
                State.items[itemIndex].searched = true;
                State.items[itemIndex].isFreshSearch = true;
                
                const $itemElement = $(`.item[data-id="${State.currentSearch.id}"]`);
                if ($itemElement.length) {
                    $itemElement.removeClass('item-revealed');
                    
                    setTimeout(() => {
                        $itemElement.addClass('item-revealed');
                        
                        setTimeout(() => {
                            $itemElement.removeClass('item-revealed');
                        }, 390);
                    }, 30);
                }
            }
            
            State.searchQueue = _.tail(State.searchQueue);
            State.searchedItems++;
            State.totalValue += State.currentSearch.value;
            State.searchTime += State.currentSearch.searchTime;
            
            StatsManager.updateAccumulatedValue(State.currentSearch.value);
            
            if (State.currentSearch.value > State.highestValue) {
                State.highestValue = State.currentSearch.value;
            }
            
            const searchTime = new Date().toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            });
            
            State.inventory = _.concat([{ 
                ...State.currentSearch, 
                searchedAt: searchTime 
            }], State.inventory);
            
            // Track collected synthesis samples
            if (typeof window.SampleManager !== 'undefined' && State.currentSearch.name) {
                window.SampleManager.onItemCollected(State.currentSearch.name);
            }
            
            if (State.currentSearch.sound && _.trim(State.currentSearch.sound) !== '' && !State.isPaused) {
                SoundManager.playItemSound(State.currentSearch.sound);
            }
            
            UIManager.updateStats();
            UIManager.updateInventory();
            UIManager.renderAllItems();
            
            if (_.isEmpty(State.searchQueue)) {
                State.isSearching = false;
                State.isPaused = false;
                State.currentSearch = null;
                $('#pause-search-btn').html('<i class="fas fa-pause"></i> 暂停搜索');
                UIManager.updatePauseButtonState();
                this.stopOpenSafeSound();
            } else {
                setTimeout(() => {
                    State.currentSearch = _.cloneDeep(_.first(State.searchQueue));
                    State.currentSearchTime = State.currentSearch.searchTime;
                    State.pauseElapsed = 0;
                    this.startSearchTimer();
                    UIManager.renderAllItems();
                }, 560);
            }
        },
        
        resetGame() {
            if (State.items.length === 0 && State.inventory.length === 0) return;
            
            if (State.searchTimer) {
                cancelAnimationFrame(State.searchTimer);
                State.searchTimer = null;
            }
            
            this.stopOpenSafeSound();
            SoundManager.clearCache();
            
            Utils.playAudio('reset-game-audio', { volume: 0.5 });
            
            this.resetGameState();
            
            $('#open-safe-btn')
                .prop('disabled', false)
                .html('<i class="fas fa-hand-pointer"></i> 打开保险');
            
            $('#pause-search-btn').html('<i class="fas fa-pause"></i> 暂停搜索');
            UIManager.updatePauseButtonState();
            UIManager.updateResetButtonState();
            
            UIManager.createGridCells();
            UIManager.updateStats();
            UIManager.updateInventory();
        },
        
        resetGameState() {
            StatsManager.resetSessionStats();
            
            _.assign(State, {
                items: [],
                searchQueue: [],
                currentSearch: null,
                searchedItems: 0,
                totalValue: 0,
                highestValue: 0,
                searchTime: 0,
                inventory: [],
                grid: _.times(Config.grid.rows, () => _.times(Config.grid.cols, () => 0)),
                isSearching: false,
                isPaused: false,
                searchTimer: null,
                currentSearchTime: 0,
                isFirstOpen: true,
                isOpenSafeBtnDisabled: false,
                pauseStartTime: 0,
                pauseElapsed: 0,
                sessionAccumulatedValue: 0
            });
        },
        
        stopOpenSafeSound() {
            const $audio = $('#open-safe-audio');
            if ($audio.length) {
                $audio[0].pause();
                $audio[0].currentTime = 0;
            }
        }
    };

    class ModalManager {
        constructor() {
            this.currentImageIndex = { donate: 0 };
        }
        
        openDonateModal() {
            this.setupImageCarousel('donate', Assets.donate);
            this.showModal('donate-modal');
        }
        
        setupImageCarousel(type, images) {
            const $imagesContainer = $(`#${type}-images`);
            const $indicatorsContainer = $(`#${type}-indicators`);
            
            $imagesContainer.empty();
            $indicatorsContainer.empty();
            
            if (!images || images.length === 0) {
                $imagesContainer.html('<div style="color:#999;padding:20px;">暂无图片</div>');
                return;
            }
            
            _.each(images, (image, index) => {
                const $img = Utils.createElement('img', {
                    className: 'carousel-image',
                    attributes: { 
                        src: _.isString(image) ? image : image.image,
                        alt: `${type} image ${index + 1}`
                    }
                });
                if (index === 0) $img.addClass('active');
                $imagesContainer.append($img);
            });
            
            _.each(images, (_, index) => {
                const $indicator = Utils.createElement('div', {
                    className: 'carousel-indicator',
                    attributes: { 'data-index': index }
                });
                if (index === 0) $indicator.addClass('active');
                $indicator.on('click', () => this.goToImage(type, index));
                $indicatorsContainer.append($indicator);
            });
            
            this.currentImageIndex[type] = 0;
        }
        
        goToImage(type, index) {
            const $images = $(`#${type}-images .carousel-image`);
            const $indicators = $(`#${type}-indicators .carousel-indicator`);
            
            $images.removeClass('active');
            $indicators.removeClass('active');
            
            if ($images.eq(index).length) $images.eq(index).addClass('active');
            if ($indicators.eq(index).length) $indicators.eq(index).addClass('active');
            
            this.currentImageIndex[type] = index;
        }
        
        prevImage(type) {
            const images = Assets[type] || [];
            const imageCount = images.length;
            if (imageCount === 0) return;
            const prevIndex = (this.currentImageIndex[type] - 1 + imageCount) % imageCount;
            this.goToImage(type, prevIndex);
        }
        
        nextImage(type) {
            const images = Assets[type] || [];
            const imageCount = images.length;
            if (imageCount === 0) return;
            const nextIndex = (this.currentImageIndex[type] + 1) % imageCount;
            this.goToImage(type, nextIndex);
        }
        
        showModal(modalId) {
            if (modalId !== 'item-tooltip') {
                const audio = new Audio('audio/sidebar-open.mp3');
                audio.volume = 0.5;
                audio.play().catch(() => {});
            }
            const $modal = $(`#${modalId}`);
            if (!$modal.length) return;
            $modal.css('display', 'flex');
            _.delay(() => $modal.addClass('show'), 10);
        }
        
        closeModal(modalId) {
            if (modalId !== 'item-tooltip') {
                const audio = new Audio('audio/sidebar-close.mp3');
                audio.volume = 0.5;
                audio.play().catch(() => {});
            }
            const $modal = $(`#${modalId}`);
            if (!$modal.length) return;
            $modal.removeClass('show');
            _.delay(() => $modal.css('display', 'none'), 300);
        }
    }

    const SettingsManager = {
        loadSettings() {
            this.updateItemPool();
        },
        
        updateItemPool() {
            allItemsConfig = itemsConfig.slice();
        }
    };

const EventManager = {
    init() {
        this.bindGameEvents();
        this.bindModalEvents();
        this.bindTooltipEvents();
        this.bindItemControlEvents();
        this.bindRarityDropdown();
        
        $(document).on('click', function(e) {
            const $target = $(e.target);
            if ($target.closest('.item, .inventory-item').length) {
                return;
            }
            Utils.playAudio('click-audio', { volume: 0.5 });
        });
    },
    
    bindRarityDropdown() {
        const $trigger = $('#rarity-dropdown-trigger');
        const $menu = $('#rarity-dropdown-menu');
        const $text = $('#rarity-dropdown-text');
        
        $trigger.on('click', function(e) {
            e.stopPropagation();
            $menu.toggleClass('show');
        });
        
        $menu.find('.dropdown-item').on('click', function() {
            const value = $(this).data('value');
            const label = $(this).text().trim();
            
            $menu.find('.dropdown-item').removeClass('selected');
            $(this).addClass('selected');
            $text.text(label);
            $menu.removeClass('show');
            
            const searchTerm = $('#item-search-input').val();
            ItemControlManager.renderItemList(searchTerm, value);
        });
        
        $(document).on('click', function() {
            $menu.removeClass('show');
        });
    },
    
    bindGameEvents() {
        const gameEvents = {
            '#open-safe-btn': () => {
                Utils.playAudio('click-audio', { volume: 0.5 });
                GameController.openSafe();
            },
            '#reset-btn': (e) => {
                if ($(e.target).prop('disabled')) return;
                Utils.playAudio('click-audio', { volume: 0.5 });
                GameController.resetGame();
            },
            '#play-sound-btn': () => {
                Utils.playAudio('click-audio', { volume: 0.5 });
                SoundManager.playSpecialSoundRandom();
            },
            '#pause-search-btn': (e) => {
                if ($(e.target).prop('disabled')) return;
                Utils.playAudio('click-audio', { volume: 0.5 });
                GameController.toggleSearchPause();
            },
            '#more-button': () => {
                Utils.playAudio('click-audio', { volume: 0.5 });
                this.openSidebar();
            }
        };
        
        _.each(gameEvents, (handler, selector) => {
            $(selector).on('click', handler);
        });
    },
    
    bindTooltipEvents() {
        const $safeGrid = $('#safe-grid');
        
        $safeGrid.on('click', '.item.searched', function(e) {
            const itemId = $(this).data('id');
            const item = _.find(State.items, { id: itemId });
            if (!item || !item.searched) return;
            
            const $tooltip = $('#item-tooltip');
            
            if ($tooltip.is(':visible') && $tooltip.data('currentItemId') === itemId) {
                TooltipManager.hide();
                $tooltip.removeData('currentItemId');
                return;
            }
            
            TooltipManager.hide();
            
            setTimeout(() => {
                TooltipManager.show(item, this);
                $tooltip.data('currentItemId', itemId);
                
                if (item.sound && _.trim(item.sound) !== '' && !State.isPaused) {
                    SoundManager.playItemSound(item.sound);
                }
            }, 50);
        });
        
        $('#inventory-list').on('click', '.inventory-item', function(e) {
            const index = $(this).index();
            const item = State.inventory[index];
            if (!item) return;
            
            if (item.sound && _.trim(item.sound) !== '' && !State.isPaused) {
                SoundManager.playItemSound(item.sound);
            }
        });
        
        $(document).on('click touchstart', function(e) {
            const $tooltip = $('#item-tooltip');
            if ($tooltip.is(':visible') && !$(e.target).closest('#item-tooltip, .item.searched, .inventory-item').length) {
                TooltipManager.hide();
                $tooltip.removeData('currentItemId');
            }
        });
        
        TooltipManager.enableDrag();
    },
    
    bindModalEvents() {
        $('#sidebar-close, #sidebar-overlay').on('click', () => this.closeSidebar());
        this.bindSidebarEvents();
        this.bindModalCloseEvents();
        this.bindCarouselEvents();
        this.bindBgSelectEvents();
    },
    
    bindSidebarEvents() {
        const sidebarEvents = {
            '#sidebar-credits-btn': () => { 
                this.openModal('credits-modal'); 
            },
            '#sidebar-announcement-btn': () => { 
                this.openModal('announcement-modal'); 
            },
            '#sidebar-donate-btn': () => { 
                modalManager.openDonateModal(); 
            },
            '#sidebar-view-leaderboard-btn': () => { 
                this.openModal('view-leaderboard-modal'); 
            },
            '#music-playlist-btn': () => { 
                this.openModal('music-playlist-modal'); 
            },
            '#sidebar-bg-select-btn': () => { 
                BackgroundManager.openSelector(); 
            }
        };
        
        _.each(sidebarEvents, (handler, selector) => {
            $(selector).on('click', handler);
        });
        
        $(document).on('click', '#profile-title-row', function() {
            const audio = new Audio('audio/sidebar-open.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
            TitleManager.renderTitleModal();
            $('#title-modal').css('display', 'flex');
            _.delay(() => $('#title-modal').addClass('show'), 10);
        });
        
        $('#title-modal-close').on('click', function() {
            const audio = new Audio('audio/sidebar-close.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
            $('#title-modal').removeClass('show');
            _.delay(() => $('#title-modal').css('display', 'none'), 300);
        });
        
        $('#title-modal').on('click', function(e) {
            if ($(e.target).is(this)) {
                const audio = new Audio('audio/sidebar-close.mp3');
                audio.volume = 0.5;
                audio.play().catch(() => {});
                $('#title-modal').removeClass('show');
                _.delay(() => $('#title-modal').css('display', 'none'), 300);
            }
        });
    },
    
    bindBgSelectEvents() {
        $('#bg-select-close').on('click', () => {
            Utils.playAudio('click-audio', { volume: 0.5 });
            this.closeModal('bg-select-modal');
        });
        
        $('#bg-prev').on('click', () => {
            BackgroundManager.prev();
        });
        
        $('#bg-next').on('click', () => {
            BackgroundManager.next();
        });
        
        $('#bg-confirm-btn').on('click', () => {
            BackgroundManager.confirmSelection();
        });
        
        $('#bg-buy-btn').on('click', () => {
            BackgroundManager.buyCurrentBackground();
        });
        
        $(document).on('click', '#bg-preview-btn', () => {
            BackgroundManager.previewCurrentBackground();
        });
        
        $('#bg-select-modal').on('click', function(e) {
            if ($(e.target).is(this)) {
                Utils.playAudio('click-audio', { volume: 0.5 });
                EventManager.closeModal('bg-select-modal');
            }
        });
    },
    
    bindModalCloseEvents() {
        const modalCloses = {
            '#credits-close': () => this.closeModal('credits-modal'),
            '#announcement-close': () => this.closeModal('announcement-modal'),
            '#donate-close': () => modalManager.closeModal('donate-modal'),
            '#submit-score-close': () => this.closeModal('submit-score-modal'),
            '#view-leaderboard-close': () => this.closeModal('view-leaderboard-modal'),
            '#music-playlist-close': () => this.closeModal('music-playlist-modal')
        };
        
        _.each(modalCloses, (handler, selector) => {
            $(selector).on('click', handler);
        });
    },
    
    bindCarouselEvents() {
        const carouselEvents = {
            '#donate-prev': () => { 
                Utils.playAudio('click-audio', { volume: 0.5 }); 
                modalManager.prevImage('donate'); 
            },
            '#donate-next': () => { 
                Utils.playAudio('click-audio', { volume: 0.5 }); 
                modalManager.nextImage('donate'); 
            }
        };
        
        _.each(carouselEvents, (handler, selector) => {
            $(selector).on('click', handler);
        });
    },
    
    bindItemControlEvents() {
        $('#sidebar-item-control-btn').on('click', () => {
            $('#password-input').val('');
            $('#password-error').hide();
            const audio = new Audio('audio/admin-open.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
            $('#password-modal').css('display', 'flex');
            _.delay(() => $('#password-modal').addClass('show'), 10);
        });
        
        $('#password-modal-confirm').on('click', () => {
            const pwd = $('#password-input').val();
            if (pwd === ItemControlManager.PASSWORD) {
                $('#password-error').hide();
                const audio = new Audio('audio/sidebar-close.mp3');
                audio.volume = 0.5;
                audio.play().catch(() => {});
                $('#password-modal').removeClass('show');
                _.delay(() => $('#password-modal').css('display', 'none'), 300);
                ItemControlManager.renderItemList();
                const audio2 = new Audio('audio/sidebar-open.mp3');
                audio2.volume = 0.5;
                audio2.play().catch(() => {});
                $('#item-control-modal').css('display', 'flex');
                _.delay(() => $('#item-control-modal').addClass('show'), 10);
            } else {
                $('#password-error').show();
                const audio = new Audio('audio/password-error.mp3');
                audio.volume = 0.5;
                audio.play().catch(() => {});
            }
        });
        
        $('#password-input').on('keydown', (e) => {
            if (e.key === 'Enter') {
                $('#password-modal-confirm').click();
            }
        });
        
        $('#password-modal-cancel, #password-modal-close').on('click', () => {
            const audio = new Audio('audio/sidebar-close.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
            $('#password-modal').removeClass('show');
            _.delay(() => $('#password-modal').css('display', 'none'), 300);
        });
        
        $('#item-control-close').on('click', () => {
            const audio = new Audio('audio/sidebar-close.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
            $('#item-control-modal').removeClass('show');
            _.delay(() => $('#item-control-modal').css('display', 'none'), 300);
        });
        
        $('#item-search-input').on('input', () => {
            const searchTerm = $('#item-search-input').val();
            const rarityFilter = $('#rarity-dropdown-menu .dropdown-item.selected').data('value') || 'all';
            ItemControlManager.renderItemList(searchTerm, rarityFilter);
        });
        
        $('#disable-all-items-btn').on('click', () => {
            const $customConfirm = $('#custom-confirm-modal');
            if (!$customConfirm.length) {
                $('body').append(`
                    <div class="modal-overlay" id="custom-confirm-modal">
                        <div class="modal-content" style="max-width:380px;">
                            <div class="modal-header">
                                <div class="modal-title"><i class="fas fa-exclamation-triangle" style="color:#f59e0b;"></i> Confirm action</div>
                                <button class="modal-close" id="custom-confirm-close">&times;</button>
                            </div>
                            <div class="modal-body" style="padding:20px 0;text-align:center;">
                                <div style="font-size:48px;color:#f59e0b;margin-bottom:16px;"><i class="fas fa-ban"></i></div>
                                <div style="color:#e2e8f0;font-size:15px;margin-bottom:8px;font-weight:500;">Are you sure you want to disable all items？</div>
                                <div style="color:#94a3b8;font-size:13px;">This will result in the inability to generate any items.</div>
                            </div>
                            <div class="modal-footer" style="justify-content:center;gap:12px;">
                                <button class="modal-btn" id="custom-confirm-cancel" style="min-width:100px;">Cancel</button>
                                <button class="modal-btn danger" id="custom-confirm-ok" style="min-width:100px;background:#ef4444;border-color:#ef4444;">Confirm disable</button>
                            </div>
                        </div>
                    </div>
                `);
                
                $('#custom-confirm-close, #custom-confirm-cancel').on('click', () => {
                    const audio = new Audio('audio/sidebar-close.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(() => {});
                    $('#custom-confirm-modal').removeClass('show');
                    _.delay(() => $('#custom-confirm-modal').css('display', 'none'), 300);
                });
                
                $('#custom-confirm-ok').on('click', () => {
                    const audio = new Audio('audio/sidebar-close.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(() => {});
                    $('#custom-confirm-modal').removeClass('show');
                    _.delay(() => $('#custom-confirm-modal').css('display', 'none'), 300);
                    ItemControlManager.disableAll();
                    const rarityFilter = $('#rarity-dropdown-menu .dropdown-item.selected').data('value') || 'all';
                    ItemControlManager.renderItemList($('#item-search-input').val(), rarityFilter);
                    if (window.showToast) window.showToast('All items have been disabled');
                });
            }
            
            const audio = new Audio('audio/sidebar-open.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
            $('#custom-confirm-modal').css('display', 'flex');
            _.delay(() => $('#custom-confirm-modal').addClass('show'), 10);
        });
        
        $('#enable-all-items-btn').on('click', () => {
            const $customConfirm = $('#enable-confirm-modal');
            if (!$customConfirm.length) {
                $('body').append(`
                    <div class="modal-overlay" id="enable-confirm-modal">
                        <div class="modal-content" style="max-width:380px;">
                            <div class="modal-header">
                                <div class="modal-title"><i class="fas fa-check-circle" style="color:#22c55e;"></i> Confirm action</div>
                                <button class="modal-close" id="enable-confirm-close">&times;</button>
                            </div>
                            <div class="modal-body" style="padding:20px 0;text-align:center;">
                                <div style="font-size:48px;color:#22c55e;margin-bottom:16px;"><i class="fas fa-check-double"></i></div>
                                <div style="color:#e2e8f0;font-size:15px;margin-bottom:8px;font-weight:500;">Are you sure you want to enable all items？</div>
                                <div style="color:#94a3b8;font-size:13px;">All items will resume normal generation.</div>
                            </div>
                            <div class="modal-footer" style="justify-content:center;gap:12px;">
                                <button class="modal-btn" id="enable-confirm-cancel" style="min-width:100px;">Cancel</button>
                                <button class="modal-btn primary" id="enable-confirm-ok" style="min-width:100px;">Confirm to enable</button>
                            </div>
                        </div>
                    </div>
                `);
                
                $('#enable-confirm-close, #enable-confirm-cancel').on('click', () => {
                    const audio = new Audio('audio/sidebar-close.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(() => {});
                    $('#enable-confirm-modal').removeClass('show');
                    _.delay(() => $('#enable-confirm-modal').css('display', 'none'), 300);
                });
                
                $('#enable-confirm-ok').on('click', () => {
                    const audio = new Audio('audio/sidebar-close.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(() => {});
                    $('#enable-confirm-modal').removeClass('show');
                    _.delay(() => $('#enable-confirm-modal').css('display', 'none'), 300);
                    ItemControlManager.enableAll();
                    const rarityFilter = $('#rarity-dropdown-menu .dropdown-item.selected').data('value') || 'all';
                    ItemControlManager.renderItemList($('#item-search-input').val(), rarityFilter);
                    if (window.showToast) window.showToast('All items have been enabled');
                });
            }
            
            const audio = new Audio('audio/sidebar-open.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
            $('#enable-confirm-modal').css('display', 'flex');
            _.delay(() => $('#enable-confirm-modal').addClass('show'), 10);
        });

        $('#edit-accumulated-value-btn').on('click', function() {
            const currentValue = ItemControlManager.getAccumulatedValue();
            $('#accumulated-value-input').val(currentValue);
            $('#accumulated-value-error').hide();
            const audio = new Audio('audio/sidebar-open.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
            $('#accumulated-value-modal').css('display', 'flex');
            _.delay(() => $('#accumulated-value-modal').addClass('show'), 10);
        });

        $('#accumulated-value-confirm').on('click', function() {
            const inputVal = $('#accumulated-value-input').val().trim();
            if (!inputVal) {
                $('#accumulated-value-error').text('Please enter a value').show();
                return;
            }
            
            const value = parseAccumulatedValue(inputVal);
            if (isNaN(value) || value < 0) {
                $('#accumulated-value-error').text('Please enter a valid numerical value (supporting K/M units)').show();
                return;
            }
            
            ItemControlManager.setAccumulatedValue(Math.round(value));
            
            const audio = new Audio('audio/sidebar-close.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
            $('#accumulated-value-modal').removeClass('show');
            _.delay(() => $('#accumulated-value-modal').css('display', 'none'), 300);
            
            if (window.showToast) window.showToast('累计价值已更新');
        });

        $('#accumulated-value-cancel, #accumulated-value-close').on('click', function() {
            const audio = new Audio('audio/sidebar-close.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
            $('#accumulated-value-modal').removeClass('show');
            _.delay(() => $('#accumulated-value-modal').css('display', 'none'), 300);
        });

        $('#accumulated-value-input').on('keydown', function(e) {
            if (e.key === 'Enter') {
                $('#accumulated-value-confirm').click();
            }
        });
    },
    
    openSidebar() {
        const audio = new Audio('audio/sidebar-open.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
        $('#sidebar').addClass('show');
        $('#sidebar-overlay').css('display', 'block');
    },
    
    closeSidebar() {
        const audio = new Audio('audio/sidebar-close.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
        $('#sidebar').removeClass('show');
        $('#sidebar-overlay').css('display', 'none');
    },
    
    openModal(modalId) {
        const audio = new Audio('audio/sidebar-open.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
        
        const $modal = $(`#${modalId}`);
        if (!$modal.length) return;
        $modal.css('display', 'flex');
        _.delay(() => $modal.addClass('show'), 10);
    },
    
    closeModal(modalId) {
        const audio = new Audio('audio/sidebar-close.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
        
        const $modal = $(`#${modalId}`);
        if (!$modal.length) return;
        $modal.removeClass('show');
        _.delay(() => $modal.css('display', 'none'), 300);
    }
};

    const modalManager = new ModalManager();

    async function init() {
        try {
            SoundManager.initAudioPool();
            SoundManager.startCleanupInterval();
            UIManager.createGridCells();
            SettingsManager.loadSettings();
            EventManager.init();
            
            StatsManager.loadAccumulatedStats();
            
            itemsConfig = await GameCore.loadItemsFromXML();
            
            SettingsManager.updateItemPool();
            
            State.grid = _.times(Config.grid.rows, () => _.times(Config.grid.cols, () => 0));
            
            UIManager.updateStats();
            UIManager.updateInventory();
            UIManager.updatePauseButtonState();
            UIManager.updateResetButtonState();
            
            StatsManager.updateAccumulatedValueDisplay();
            TitleManager.updateTitleDisplay();
            
            await BackgroundManager.loadBackgrounds();
            const savedPath = localStorage.getItem(BackgroundManager.storageKey);
            if (!savedPath) {
                BackgroundManager.applyBackground(BackgroundManager.backgrounds[0].path);
            } else {
                BackgroundManager.loadSavedBackground();
            }
            
            const uid = SimpleMail.getCurrentUid();
            const welcomeKey = 'welcome_mail_sent_v2_' + uid;
            if (!localStorage.getItem(welcomeKey)) {
                const ok = await SimpleMail.adminSendMail(uid, 'HeFun', '欢迎使用暗区突围保险箱模拟器', '<p>感谢您使用我制作的软件！</p><p>祝您游戏愉快，暗区天天出大金！</p>');
                if (ok) {
                    localStorage.setItem(welcomeKey, 'true');
                }
            }
            
            await SimpleMail.refreshSidebar();
            await SimpleMail.updateBadges();
            setInterval(() => SimpleMail.checkNewMails(), 10000);
            setTimeout(() => SimpleMail.checkNewMails(), 2000);
            
            window.toggleSearchPause = GameController.toggleSearchPause.bind(GameController);
        } catch (error) {}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

});
