// Plugin for time range selector
const timeRangeSelector = {
    id: 'timeRangeSelector',
    
    beforeInit(chart) {
        console.log('🔧 Plugin initialized!');
        chart.timeSelection = {
            isSelecting: false,
            startX: null,
            endX: null,
            eventsAttached: false
        };
    },
    
    afterInit(chart) {
        if (!chart.timeSelection.eventsAttached) {
            this.setupCanvasEvents(chart);
            chart.timeSelection.eventsAttached = true;
        }
    },
    
    setupCanvasEvents(chart) {
        const canvas = chart.canvas;
        if (!canvas) {
            console.warn('⚠️ Canvas not found');
            return;
        }
        
        console.log('🎯 Setting up canvas events');
        
        const selection = chart.timeSelection;
        let isMouseDown = false;
        
        // Remove any existing listeners first
        canvas.removeEventListener('mousedown', canvas._chartMouseDown);
        document.removeEventListener('mousemove', canvas._chartMouseMove);
        document.removeEventListener('mouseup', canvas._chartMouseUp);
        canvas.removeEventListener('mouseleave', canvas._chartMouseLeave);
        
        // Create bound functions so we can remove them later
        canvas._chartMouseDown = (e) => {
            console.log('🖱️ Canvas mousedown detected!');
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            
            isMouseDown = true;
            selection.isSelecting = true;
            selection.startX = x;
            selection.endX = x;
            
            console.log('Starting selection at x:', x);
            chart.update('none');
            e.preventDefault();
        };
        
        // Move mousemove to document level so it works outside canvas
        canvas._chartMouseMove = (e) => {
            if (isMouseDown && selection.isSelecting) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                
                // Clamp x to canvas boundaries
                const clampedX = Math.max(0, Math.min(x, rect.width));
                
                selection.endX = clampedX;
                console.log('🚀 Dragging to x:', clampedX);
                chart.update('none');
                e.preventDefault();
            }
        };
        
        // Move mouseup to document level so it works outside canvas
        canvas._chartMouseUp = (e) => {
            if (isMouseDown && selection.isSelecting) {
                console.log('🎉 Selection complete!');
                isMouseDown = false;
                selection.isSelecting = false;
                
                this.applySelection(chart);
                e.preventDefault();
            }
        };
        
        canvas._chartMouseLeave = (e) => {
            // Don't end selection when mouse leaves - keep dragging active
            console.log('🚪 Mouse left canvas - continuing selection');
        };
        
        // Add the event listeners
        canvas.addEventListener('mousedown', canvas._chartMouseDown);
        document.addEventListener('mousemove', canvas._chartMouseMove); // Document level!
        document.addEventListener('mouseup', canvas._chartMouseUp);     // Document level!
        canvas.addEventListener('mouseleave', canvas._chartMouseLeave);
    },
    
    getDataIndexFromX(chart, x) {
        const xScale = chart.scales.x;
        if (!xScale) return null;
        
        const chartLeft = xScale.left;
        const chartRight = xScale.right;
        const chartWidth = chartRight - chartLeft;
        
        // Don't return null for coordinates outside bounds - clamp them instead
        const clampedX = Math.max(chartLeft, Math.min(x, chartRight));
        
        const relativeX = (clampedX - chartLeft) / chartWidth;
        const filteredData = chart.config._config.filteredData || [];
        
        if (filteredData.length === 0) return null;
        
        const dataIndex = Math.round(relativeX * (filteredData.length - 1));
        return Math.max(0, Math.min(dataIndex, filteredData.length - 1));
    },
    
    applySelection(chart) {
        const selection = chart.timeSelection;
        if (selection.startX !== null && selection.endX !== null) {
            // Get canvas boundaries for proper clamping
            const canvas = chart.canvas;
            const rect = canvas.getBoundingClientRect();
            
            // Clamp selection coordinates to canvas boundaries
            const clampedStartX = Math.max(0, Math.min(selection.startX, rect.width));
            const clampedEndX = Math.max(0, Math.min(selection.endX, rect.width));
            
            const startIndex = this.getDataIndexFromX(chart, clampedStartX);
            const endIndex = this.getDataIndexFromX(chart, clampedEndX);
            
            console.log('📊 Clamped coordinates:', clampedStartX, 'to', clampedEndX);
            console.log('📊 Relative indices in current view:', startIndex, 'to', endIndex);
            
            if (startIndex !== null && endIndex !== null && startIndex !== endIndex) {
                const startIdx = Math.min(startIndex, endIndex);
                const endIdx = Math.max(startIndex, endIndex);
                
                // Get current slider positions (these represent absolute indices in full dataset)
                const currentStartIndex = parseInt(document.getElementById('time-range-start').value);
                const currentEndIndex = parseInt(document.getElementById('time-range-end').value);
                
                // Calculate how the selection maps to the current visible range
                const currentRangeSize = currentEndIndex - currentStartIndex;
                const filteredDataLength = chart.config._config.filteredData?.length || 1;
                const selectionStartRatio = startIdx / Math.max(1, filteredDataLength - 1);
                const selectionEndRatio = endIdx / Math.max(1, filteredDataLength - 1);
                
                // Map to absolute indices
                const absoluteStartIdx = currentStartIndex + Math.round(selectionStartRatio * currentRangeSize);
                const absoluteEndIdx = currentStartIndex + Math.round(selectionEndRatio * currentRangeSize);
                
                console.log('🎯 Current range:', currentStartIndex, 'to', currentEndIndex);
                console.log('🎯 New absolute range:', absoluteStartIdx, 'to', absoluteEndIdx);
                
                // Ensure valid range
                const maxIndex = parseInt(document.getElementById('time-range-end').max);
                const finalStartIdx = Math.max(0, Math.min(absoluteStartIdx, maxIndex - 1));
                const finalEndIdx = Math.max(finalStartIdx + 1, Math.min(absoluteEndIdx, maxIndex));
                
                console.log('🎯 Final range:', finalStartIdx, 'to', finalEndIdx);
                
                // Update sliders
                document.getElementById('time-range-start').value = finalStartIdx;
                document.getElementById('time-range-end').value = finalEndIdx;
                
                // Update the visualization
                const visualizer = chart.config._config.visualizer;
                if (visualizer) {
                    visualizer.updateRangeLabels();
                    visualizer.updateVisualRange();
                    visualizer.updateChart();
                }
            }
        }
        
        selection.startX = null;
        selection.endX = null;
    },
    
    beforeDestroy(chart) {
        // Clean up event listeners when chart is destroyed
        const canvas = chart.canvas;
        if (canvas && chart.timeSelection.eventsAttached) {
            canvas.removeEventListener('mousedown', canvas._chartMouseDown);
            document.removeEventListener('mousemove', canvas._chartMouseMove); // Document level!
            document.removeEventListener('mouseup', canvas._chartMouseUp);     // Document level!
            canvas.removeEventListener('mouseleave', canvas._chartMouseLeave);
            chart.timeSelection.eventsAttached = false;
        }
    },
    
    afterDraw(chart) {
        const selection = chart.timeSelection;
        if (selection.isSelecting && selection.startX !== null && selection.endX !== null) {
            const ctx = chart.ctx;
            const chartArea = chart.chartArea;
            
            const startX = Math.min(selection.startX, selection.endX);
            const endX = Math.max(selection.startX, selection.endX);
            
            if (Math.abs(endX - startX) > 2) {
                ctx.save();
                ctx.fillStyle = 'rgba(0, 114, 189, 0.2)';
                ctx.fillRect(startX, chartArea.top, endX - startX, chartArea.bottom - chartArea.top);
                
                ctx.strokeStyle = 'rgba(0, 114, 189, 0.8)';
                ctx.lineWidth = 2;
                ctx.strokeRect(startX, chartArea.top, endX - startX, chartArea.bottom - chartArea.top);
                ctx.restore();
            }
        }
    }
};

class RecessionRiskVisualizer {
    constructor() {
        this.countryData = {};
        this.countryDataOOS = {}; // New property for out-of-sample data
        this.chart = null;
        this.selectedCountries = ['US'];
        this.estimationMode = 'latest'; // New property: 'latest', 'realtime', 'both'
        this.lastModified = null;
        this.hasOOSError = false; // Add error state tracking
        this.countryLabels = {
            'EA': 'Euro Area',
            'US': 'United States'
        };
        // Define color palette based on selection order
        this.colorPalette = [
            '#0072bd',  // Blue - 1st country
            '#d95319',  // Orange - 2nd country  
            '#edb120',  // Yellow - 3rd country
            '#7e2f8e',  // Purple - 4th country
            '#77ac30',  // Green - 5th country
            '#a2142f'   // Red - 6th country
        ];
        this.init();
    }

    async init() {
        try {
            await this.loadMetaData();
            await this.loadSelectedCountries();
            this.setupControls();
            this.createChart();
            this.showStats();
            this.showHeaderStats();
            this.hideLoading();
            this.updateLastModified();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async loadCountryData(countryCode) {
        if (this.countryData[countryCode]) {
            return this.countryData[countryCode];
        }

        try {
            const fileName = `./data/recessionrisk_${countryCode}.csv`;
            const response = await fetch(fileName);
            if (!response.ok) {
                throw new Error(`Could not load ${fileName}`);
            }
            const csvText = await response.text();
            
            return new Promise((resolve, reject) => {
                Papa.parse(csvText, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        if (results.errors.length > 0) {
                            reject(new Error('CSV parsing error: ' + results.errors[0].message));
                        } else if (!results.data || results.data.length === 0) {
                            reject(new Error('No data found in CSV file'));
                        } else {
                            const processedData = this.processCountryData(results.data);
                            this.countryData[countryCode] = {
                                data: processedData,
                                csvText: csvText
                            };
                            resolve(processedData);
                        }
                    },
                    error: (error) => {
                        reject(new Error('CSV parsing failed: ' + error.message));
                    }
                });
            });
        } catch (error) {
            console.warn(`Failed to load data for ${countryCode}:`, error);
            return null;
        }
    }

    // New method to load OOS data
    async loadCountryDataOOS(countryCode) {
        if (this.countryDataOOS[countryCode]) {
            return this.countryDataOOS[countryCode];
        }

        try {
            const fileName = `./data/recessionrisk_${countryCode}_oos.csv`;
            const response = await fetch(fileName);
            if (!response.ok) {
                console.warn(`Could not load ${fileName} - OOS data not available for ${countryCode}`);
                return null;
            }
            const csvText = await response.text();
            
            return new Promise((resolve, reject) => {
                Papa.parse(csvText, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        if (results.errors.length > 0) {
                            reject(new Error('CSV parsing error: ' + results.errors[0].message));
                        } else if (!results.data || results.data.length === 0) {
                            reject(new Error('No data found in CSV file'));
                        } else {
                            const processedData = this.processCountryData(results.data);
                            this.countryDataOOS[countryCode] = {
                                data: processedData,
                                csvText: csvText
                            };
                            resolve(processedData);
                        }
                    },
                    error: (error) => {
                        reject(new Error('CSV parsing failed: ' + error.message));
                    }
                });
            });
        } catch (error) {
            console.warn(`Failed to load OOS data for ${countryCode}:`, error);
            return null;
        }
    }

    processCountryData(data) {
        data.forEach(row => {
            const year = row.Time.includes("198") ? parseInt(row.Time.match(/\d{4}/)?.[0]) || 1980 :
                        row.Time.includes("199") ? parseInt(row.Time.match(/\d{4}/)?.[0]) || 1990 :
                        row.Time.includes("200") ? parseInt(row.Time.match(/\d{4}/)?.[0]) || 2000 :
                        row.Time.includes("201") ? parseInt(row.Time.match(/\d{4}/)?.[0]) || 2010 :
                        row.Time.includes("202") ? parseInt(row.Time.match(/\d{4}/)?.[0]) || 2020 : 2020;
            
            const month = row.Time.split(" ")[0];
            row.parsedDate = new Date(`${month} 1, ${year}`);
        });

        return data.sort((a, b) => a.parsedDate - b.parsedDate);
    }

    async loadSelectedCountries() {
        const loadPromises = this.selectedCountries.map(country => this.loadCountryData(country));
        const results = await Promise.allSettled(loadPromises);
        
        // Remove countries that failed to load
        this.selectedCountries = this.selectedCountries.filter((country, index) => 
            results[index].status === 'fulfilled' && results[index].value !== null
        );

        if (this.selectedCountries.length === 0) {
            throw new Error('No country data could be loaded');
        }

        // Load OOS data for selected countries (but don't fail if unavailable)
        const oosLoadPromises = this.selectedCountries.map(country => this.loadCountryDataOOS(country));
        await Promise.allSettled(oosLoadPromises);
    }
    
    async loadMetaData() {
        try {
            const metaResponse = await fetch('./data/metadata.json');
            if (metaResponse.ok) {
                const metadata = await metaResponse.json();
                this.lastModified = new Date(metadata.last_updated);
            } else {
                console.warn('metadata.json not found, using current date');
                this.lastModified = new Date();
            }
        } catch (metaError) {
            console.warn('Could not load metadata.json, using current date:', metaError);
            this.lastModified = new Date();
        }
    }

    setupControls() {
        // Set up dropdown functionality
        const dropdownSelected = document.getElementById('country-dropdown-selected');
        const dropdownMenu = document.getElementById('country-dropdown-menu');
        
        // Toggle dropdown
        dropdownSelected.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownSelected.classList.toggle('open');
            dropdownMenu.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.country-dropdown')) {
                dropdownSelected.classList.remove('open');
                dropdownMenu.classList.remove('show');
            }
        });
        
        // Prevent dropdown from closing when clicking inside menu
        dropdownMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Set up checkbox event listeners
        const checkboxes = dropdownMenu.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.handleCountrySelectionChange();
                this.updateSelectedCountDisplay();
            });
        });

        // Set up estimation method radio buttons
        const estimationRadios = document.querySelectorAll('input[name="estimation"]');
        estimationRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                console.log('🔄 Radio button changed to:', e.target.value);
                this.estimationMode = e.target.value;
                
                console.log('🔄 About to hide OOS error, current hasOOSError:', this.hasOOSError);
                this.hideOOSDataError();
                console.log('🔄 After hiding OOS error, hasOOSError:', this.hasOOSError);
                
                console.log('🔄 About to call createChart');
                this.createChart(true);
                console.log('🔄 After createChart call');
                
                this.showStats();
                this.showHeaderStats();
            });
        });


        document.getElementById('time-range-start').addEventListener('input', () => this.handleRangeChange());
        document.getElementById('time-range-end').addEventListener('input', () => this.handleRangeChange());
        document.getElementById('download-btn').addEventListener('click', () => this.downloadCSV());
        
        this.updateRangeSliders();
        this.updateSelectedCountDisplay();
    }

    updateSelectedCountDisplay() {
        const checkboxes = document.querySelectorAll('#country-dropdown-menu input[type="checkbox"]');
        const selectedCountries = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        const selectedCount = selectedCountries.length;
        const selectedCountEl = document.getElementById('selected-count');
        
        if (selectedCount === 0) {
            selectedCountEl.textContent = 'Select countries';
        } else if (selectedCount <= 10) {
            // Show individual country names up to 3 countries
            const countryNames = selectedCountries.map(country => this.countryLabels[country]);
            selectedCountEl.textContent = countryNames.join(', ');
        } else {
            // Show count for 4+ countries
            selectedCountEl.textContent = `${selectedCount} countries`;
        }
    }

    async handleCountrySelectionChange() {
        const checkboxes = document.querySelectorAll('#country-dropdown-menu input[type="checkbox"]');
        const newSelection = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        if (newSelection.length === 0) {
            // Don't allow deselecting all countries
            return;
        }

        // Load any new countries that aren't already loaded
        const loadPromises = newSelection
            .filter(country => !this.countryData[country])
            .map(country => this.loadCountryData(country));

        // Load OOS data for new countries
        const oosLoadPromises = newSelection
            .filter(country => !this.countryDataOOS[country])
            .map(country => this.loadCountryDataOOS(country));

        if (loadPromises.length > 0 || oosLoadPromises.length > 0) {
            try {
                await Promise.allSettled([...loadPromises, ...oosLoadPromises]);
            } catch (error) {
                console.warn('Some countries failed to load:', error);
            }
        }

        // Update selected countries to only include successfully loaded ones
        this.selectedCountries = newSelection.filter(country => this.countryData[country]);

        // Update checkboxes to reflect what actually loaded
        checkboxes.forEach(checkbox => {
            if (newSelection.includes(checkbox.value) && !this.countryData[checkbox.value]) {
                checkbox.checked = false;
            }
        });

        // Handle estimation method availability
        this.updateEstimationMethodAvailability();

        this.updateRangeSliders();
        
        // Clear any existing error state when changing countries
        this.hideOOSDataError();
        
        this.createChart(); // This will now properly check for error state
        this.showStats();
        this.showHeaderStats();
    }

    updateEstimationMethodAvailability() {
        const selectedCount = this.selectedCountries.length;
        const bothOption = document.getElementById('both-option');
        
        if (bothOption) {
            if (selectedCount > 1) {
                // Disable "Both" for multiple countries
                bothOption.disabled = true;
                // Switch away from "Both" if currently selected
                if (this.estimationMode === 'both') {
                    document.querySelector('input[value="latest"]').checked = true;
                    this.estimationMode = 'latest';
                }
            } else {
                // Enable "Both" for single country
                bothOption.disabled = false;
            }
        }
    }

    downloadCSV() {
        if (this.selectedCountries.length === 1) {
            const country = this.selectedCountries[0];
            let csvData, filename, countryLabel;
            
            countryLabel = country;
            
            if (this.estimationMode === 'realtime') {
                // Download OOS data
                if (this.countryDataOOS[country]) {
                    csvData = this.countryDataOOS[country].csvText;
                    filename = `recession_risk_${countryLabel.replace(/\s+/g, '_')}_realtime.csv`;
                } else {
                    // Fallback to latest if OOS not available
                    csvData = this.countryData[country].csvText;
                    filename = `recession_risk_${countryLabel.replace(/\s+/g, '_')}_latest.csv`;
                }
            } else if (this.estimationMode === 'both') {
                // Create combined CSV with both latest and real-time p50
                csvData = this.generateBothEstimatesCSV(country);
                filename = `recession_risk_${countryLabel.replace(/\s+/g, '_')}_both.csv`;
            } else {
                // Download latest estimates
                csvData = this.countryData[country].csvText;
                filename = `recession_risk_${countryLabel.replace(/\s+/g, '_')}_latest.csv`;
            }
            
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } else {
            // Multiple countries - existing code remains the same
            const combinedCSV = this.generateCombinedCSV();
            const modeLabel = this.estimationMode === 'realtime' ? '_realtime' : '_latest';
            const countryCodes = this.selectedCountries.join('_');
            const filename = `recession_risk_${countryCodes}${modeLabel}.csv`;
            
            const blob = new Blob([combinedCSV], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    }

    generateCombinedCSV() {
        // Create a combined CSV with all selected countries based on current estimation mode
        const filteredData = this.getFilteredData();
        if (!filteredData || filteredData.length === 0) {
            return 'Time\n';
        }

        let csv = 'Time';
        this.selectedCountries.forEach(country => {
            csv += `,RecessionRisk_${country}_p50`;
        });
        csv += '\n';

        filteredData.forEach(dataPoint => {
            csv += dataPoint.Time;
            this.selectedCountries.forEach(country => {
                const countryData = dataPoint[country];
                const value = countryData ? (countryData.RecessionRisk_p50).toFixed(4) : '';
                csv += `,${value}`;
            });
            csv += '\n';
        });

        return csv;
    }

    generateBothEstimatesCSV(country) {
        // Create a CSV with both latest and real-time p50 estimates
        const latestData = this.countryData[country]?.data || [];
        const oosData = this.countryDataOOS[country]?.data || [];
        
        if (latestData.length === 0 && oosData.length === 0) {
            return 'Time,RecessionRisk_Latest_p50,RecessionRisk_RealTime_p50,Recession\n';
        }
        
        // Get all unique time points from both datasets
        const allTimePoints = new Set();
        latestData.forEach(row => allTimePoints.add(row.Time));
        oosData.forEach(row => allTimePoints.add(row.Time));
        
        // Sort time points chronologically
        const sortedTimePoints = Array.from(allTimePoints).sort((a, b) => {
            const dateA = this.parseTimeString(a);
            const dateB = this.parseTimeString(b);
            return dateA - dateB;
        });
        
        // Build CSV
        let csv = 'Time,RecessionRisk_Latest_p50,RecessionRisk_RealTime_p50,Recession\n';
        
        sortedTimePoints.forEach(timePoint => {
            const latestRow = latestData.find(row => row.Time === timePoint);
            const oosRow = oosData.find(row => row.Time === timePoint);
            
            const latestValue = latestRow ? latestRow.RecessionRisk_p50.toFixed(4) : '';
            const oosValue = oosRow ? oosRow.RecessionRisk_p50.toFixed(4) : '';
            const recessionValue = latestRow ? latestRow.Recession : (oosRow ? oosRow.Recession : '');
            
            csv += `${timePoint},${latestValue},${oosValue},${recessionValue}\n`;
        });
        
        return csv;
    }

    updateLastModified() {
        const lastUpdatedEl = document.getElementById('last-updated-text');
        if (this.lastModified && lastUpdatedEl) {
            const options = { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
            };
            const formattedDate = this.lastModified.toLocaleDateString('en-US', options);
            lastUpdatedEl.textContent = formattedDate;
        }
        fetch('data/next_update.txt')
            .then(r => r.text())
            .then(text => {
                const nextUpdateEl = document.getElementById('next-update-text');
                if (nextUpdateEl) nextUpdateEl.textContent = text.trim();
            });
    }

    updateVisualRange() {
        if (this.hasOOSError) return;
        
        const filteredData = this.getFilteredData();
        if (!filteredData || filteredData.length === 0) return;
        
        const startSlider = document.getElementById('time-range-start');
        const endSlider = document.getElementById('time-range-end');
        
        const startVal = parseInt(startSlider.value);
        const endVal = parseInt(endSlider.value);
        const maxVal = parseInt(startSlider.max);
        
        const startPercent = (startVal / maxVal) * 100;
        const endPercent = (endVal / maxVal) * 100;
        
        startSlider.style.setProperty('--start-percent', `${startPercent}%`);
        startSlider.style.setProperty('--end-percent', `${endPercent}%`);
    }

    handleRangeChange() {
        if (this.hasOOSError) return;
        
        const startSlider = document.getElementById('time-range-start');
        const endSlider = document.getElementById('time-range-end');
        
        let startVal = parseInt(startSlider.value);
        let endVal = parseInt(endSlider.value);
        
        if (startVal >= endVal) {
            if (startSlider === document.activeElement) {
                endVal = Math.min(startVal + 1, this.getAllTimePoints().length - 1);
                endSlider.value = endVal;
            } else {
                startVal = Math.max(endVal - 1, 0);
                startSlider.value = startVal;
            }
        }

        this.updateRangeLabels();
        this.updateVisualRange();
        this.updateChart();
    }

    getAllTimePoints() {
        // Get all unique time points across all selected countries and estimation modes
        const allTimePoints = new Set();
        
        this.selectedCountries.forEach(country => {
            if (this.countryData[country]) {
                this.countryData[country].data.forEach(row => {
                    allTimePoints.add(row.Time);
                });
            }
            if (this.countryDataOOS[country]) {
                this.countryDataOOS[country].data.forEach(row => {
                    allTimePoints.add(row.Time);
                });
            }
        });

        return Array.from(allTimePoints).sort((a, b) => {
            const dateA = this.parseTimeString(a);
            const dateB = this.parseTimeString(b);
            return dateA - dateB;
        });
    }

    parseTimeString(timeStr) {
        const year = timeStr.includes("198") ? parseInt(timeStr.match(/\d{4}/)?.[0]) || 1980 :
                    timeStr.includes("199") ? parseInt(timeStr.match(/\d{4}/)?.[0]) || 1990 :
                    timeStr.includes("200") ? parseInt(timeStr.match(/\d{4}/)?.[0]) || 2000 :
                    timeStr.includes("201") ? parseInt(timeStr.match(/\d{4}/)?.[0]) || 2010 :
                    timeStr.includes("202") ? parseInt(timeStr.match(/\d{4}/)?.[0]) || 2020 : 2020;
        
        const month = timeStr.split(" ")[0];
        return new Date(`${month} 1, ${year}`);
    }

    updateRangeSliders() {
        const allTimePoints = this.getAllTimePoints();
        if (allTimePoints.length === 0) return;
        
        const startSlider = document.getElementById('time-range-start');
        const endSlider = document.getElementById('time-range-end');
        
        if (startSlider && endSlider) {
            startSlider.max = allTimePoints.length - 1;
            endSlider.max = allTimePoints.length - 1;
            endSlider.value = allTimePoints.length - 1;
            
            // Check if we're on mobile (screen width <= 768px)
            const isMobile = window.innerWidth <= 768;
            
            // Start from beginning for all devices
            startSlider.value = 0;
            
            this.updateRangeLabels();
            this.updateVisualRange();
        }
    }

    updateRangeLabels() {
        const allTimePoints = this.getAllTimePoints();
        if (allTimePoints.length === 0) return;
        
        const startIndex = parseInt(document.getElementById('time-range-start')?.value || 0);
        const endIndex = parseInt(document.getElementById('time-range-end')?.value || allTimePoints.length - 1);
        
        const startLabel = document.getElementById('range-start-label');
        const endLabel = document.getElementById('range-end-label');
        
        if (startLabel && allTimePoints[startIndex]) {
            startLabel.textContent = allTimePoints[startIndex];
        }
        if (endLabel && allTimePoints[endIndex]) {
            endLabel.textContent = allTimePoints[endIndex];
        }
    }
    
    showOOSDataError(missingCountries) {
        const countryNames = missingCountries.map(country => this.countryLabels[country] || country);
        
        // Set error state
        this.hasOOSError = true;
        
        // Don't hide the entire chart section, just clear the chart and show message
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        
        // Create a simple message in the chart container
        const chartContainer = document.querySelector('.chart-container');
        chartContainer.innerHTML = `
            <div class="chart-error-message">
                <div class="chart-error-icon">📊</div>
                <div class="chart-error-title">Real-time data missing</div>
            </div>
        `;
    }

    hideOOSDataError() {
        this.hasOOSError = false;
        
        // Restore the chart canvas
        const chartContainer = document.querySelector('.chart-container');
        chartContainer.innerHTML = '<canvas id="chart"></canvas>';
    }

    getCountryColor(country) {
        const index = this.selectedCountries.indexOf(country);
        return index >= 0 ? this.colorPalette[index] : this.colorPalette[0];
    }

    getAvailableCountryColor(country, availableCountries) {
        // Use the index within availableCountries, not selectedCountries
        const index = availableCountries.indexOf(country);
        return index >= 0 ? this.colorPalette[index] : this.colorPalette[0];
    }

    getFilteredData() {
        const allTimePoints = this.getAllTimePoints();
        if (allTimePoints.length === 0) return [];
        
        const startIndex = parseInt(document.getElementById('time-range-start')?.value || 0);
        const endIndex = parseInt(document.getElementById('time-range-end')?.value || allTimePoints.length - 1);
        
        const selectedTimePoints = allTimePoints.slice(startIndex, Math.min(endIndex + 1, allTimePoints.length));
        
        // For single country, show error if missing required data
        if (this.selectedCountries.length === 1) {
            const country = this.selectedCountries[0];
            const hasLatest = !!this.countryData[country];
            const hasOOS = !!this.countryDataOOS[country];
            
            if (this.estimationMode === 'realtime' && !hasOOS) {
                this.showOOSDataError([country]);
                return [];
            }
            if (this.estimationMode === 'both' && (!hasLatest || !hasOOS)) {
                this.showOOSDataError([country]);
                return [];
            }
        }
        
        // For multiple countries, silently filter out countries with missing data
        const availableCountries = this.selectedCountries.filter(country => {
            const hasLatest = !!this.countryData[country];
            const hasOOS = !!this.countryDataOOS[country];
            
            if (this.estimationMode === 'latest') {
                return hasLatest;
            } else if (this.estimationMode === 'realtime') {
                return hasOOS;
            } else if (this.estimationMode === 'both') {
                return hasLatest && hasOOS;
            }
            return false;
        });
        
        // Create combined data structure
        return selectedTimePoints.map(timePoint => {
            const dataPoint = { Time: timePoint };
            
            availableCountries.forEach(country => {
                const latestData = this.countryData[country]?.data.find(row => row.Time === timePoint);
                const oosData = this.countryDataOOS[country]?.data.find(row => row.Time === timePoint);
                
                if (this.estimationMode === 'latest') {
                    dataPoint[country] = latestData || null;
                } else if (this.estimationMode === 'realtime') {
                    dataPoint[country] = oosData || null;
                } else if (this.estimationMode === 'both') {
                    dataPoint[country] = latestData || null;
                    dataPoint[`${country}_OOS`] = oosData || null;
                }
            });
            
            return dataPoint;
        });
    }

    createChart(skipAnimation = false) {
        // Don't create chart if we're in error state
        console.log('🎨 createChart called, hasOOSError:', this.hasOOSError);
        const filteredData = this.getFilteredData();
        console.log('🎨 Got filteredData, length:', filteredData.length, 'hasOOSError:', this.hasOOSError);
        if (filteredData.length === 0 || this.hasOOSError) {
            console.log('🎨 Returning early - no data or error state');
            return;
        }
        console.log('🎨 Proceeding with chart creation');
        this.hideOOSDataError();

        const ctx = document.getElementById('chart').getContext('2d');
        const chartData = this.prepareChartData(filteredData);

        if (this.chart) {
            this.chart.destroy();
        }

        const isSingleCountry = this.selectedCountries.length === 1;

        // Create chart with empty datasets first for sequential appearance
        const emptyData = {
            labels: chartData.labels,
            datasets: chartData.datasets.map(dataset => ({
                ...dataset,
                data: new Array(chartData.labels.length).fill(null)
            }))
        };

        this.chart = new Chart(ctx, {
            type: 'line',
            data: emptyData,
            options: {
                animation: {
                    duration: 0
                },
                animations: {
                    colors: false,
                    x: false,
                    y: false
                },
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: false, // This will show lines instead of points
                            padding: 20,
                            filter: function(legendItem, chartData) {
                                const dataset = chartData.datasets[legendItem.datasetIndex];
                                return !dataset.label.includes('Upper') && !dataset.label.includes('Lower');
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        filter: function(tooltipItem) {
                            return !tooltipItem.dataset.label.includes('Upper') && 
                                !tooltipItem.dataset.label.includes('Lower');
                        },
                        callbacks: {
                            label: function(context) {
                                const filteredData = context.chart.config._config.filteredData || [];
                                const dataPoint = filteredData[context.dataIndex];
                                const selectedCountries = context.chart.config._config.selectedCountries || [];
                                const estimationMode = context.chart.config._config.estimationMode;
                                
                                if (isSingleCountry && estimationMode !== 'both') {
                                    const country = selectedCountries[0];
                                    if (dataPoint && dataPoint[country]) {
                                        const countryData = dataPoint[country];
                                        return `${context.dataset.label}: ${(countryData.RecessionRisk_p50 * 100).toFixed(1)}% [${(countryData.RecessionRisk_p05 * 100).toFixed(1)}% - ${(countryData.RecessionRisk_p95 * 100).toFixed(1)}%]`;
                                    }
                                } else {
                                    const datasetLabel = context.dataset.label;
                                    let countryData = null;
                                    
                                    if (estimationMode === 'both' && isSingleCountry) {
                                        const country = selectedCountries[0];
                                        if (datasetLabel.includes('Real-Time')) {
                                            countryData = dataPoint[`${country}_OOS`];
                                        } else {
                                            countryData = dataPoint[country];
                                        }
                                    } else {
                                        const countryCode = selectedCountries.find(country => 
                                            datasetLabel.includes(this.chart.config._config.visualizer.countryLabels[country])
                                        );
                                        if (countryCode && dataPoint[countryCode]) {
                                            countryData = dataPoint[countryCode];
                                        }
                                    }
                                    
                                    if (countryData) {
                                        return `${datasetLabel}: ${(countryData.RecessionRisk_p50 * 100).toFixed(1)}% [${(countryData.RecessionRisk_p05 * 100).toFixed(1)}% - ${(countryData.RecessionRisk_p95 * 100).toFixed(1)}%]`;
                                    }
                                }
                                
                                return `${context.dataset.label}: ${(context.parsed.y * 100).toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        ticks: {
                            maxRotation: 45,
                            font: { size: 10 }
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Recession Risk',
                            font: { size: 14, weight: 'bold' }
                        },
                        ticks: {
                            callback: function(value) {
                                return (value * 100).toFixed(0) + '%';
                            }
                        },
                        min: 0,
                        max: 1
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    point: {
                        radius: 0,
                        hoverRadius: 6
                    }
                }
            },
            plugins: [
                timeRangeSelector,
                {
                    id: 'recessionBands',
                    beforeDatasetsDraw: (chart) => {
                        const { ctx, chartArea, scales } = chart;
                        const filteredData = chart.config._config.filteredData || [];
                        const selectedCountries = chart.config._config.selectedCountries || [];
                        const visualizer = chart.config._config.visualizer;
                        const estimationMode = chart.config._config.estimationMode;
                        
                        if (!chartArea || !scales.x || !scales.y || filteredData.length === 0) {
                            return;
                        }
                        
                        ctx.save();
                        
                        const hexToRgba = (hex, alpha) => {
                            const r = parseInt(hex.slice(1, 3), 16);
                            const g = parseInt(hex.slice(3, 5), 16);
                            const b = parseInt(hex.slice(5, 7), 16);
                            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                        };
                        
                        if (selectedCountries.length === 1) {
                            const country = selectedCountries[0];
                            
                            let i = 0;
                            while (i < filteredData.length) {
                                const dataPoint = filteredData[i];
                                
                                // Always use latest data for recession bands, even in real-time mode
                                let recessionData;
                                if (estimationMode === 'realtime' || estimationMode === 'both') {
                                    // For real-time mode, try to get recession data from latest dataset
                                    const latestCountryData = visualizer.countryData[country]?.data.find(row => row.Time === dataPoint.Time);
                                    recessionData = latestCountryData || dataPoint[country];
                                } else {
                                    // For latest mode, use the existing logic
                                    recessionData = dataPoint[country];
                                }
                                
                                if (recessionData && recessionData.Recession === 1) {
                                    let recessionStart = i;
                                    let recessionEnd = i;
                                    
                                    // Look ahead to find the end of the recession period
                                    while (recessionEnd < filteredData.length - 1) {
                                        const nextDataPoint = filteredData[recessionEnd + 1];
                                        let nextRecessionData;
                                        
                                        if (estimationMode === 'realtime' || estimationMode === 'both') {
                                            const nextLatestData = visualizer.countryData[country]?.data.find(row => row.Time === nextDataPoint.Time);
                                            nextRecessionData = nextLatestData || nextDataPoint[country];
                                        } else {
                                            nextRecessionData = nextDataPoint[country];
                                        }
                                        
                                        if (nextRecessionData && nextRecessionData.Recession === 1) {
                                            recessionEnd++;
                                        } else {
                                            break;
                                        }
                                    }
                                    
                                    let shadingStart = Math.max(0, recessionStart - 1);
                                    let shadingEnd = recessionEnd;
                                    
                                    for (let j = shadingStart; j < shadingEnd; j++) {
                                        const startX = scales.x.getPixelForValue(j);
                                        const endX = scales.x.getPixelForValue(j + 1);
                                        
                                        ctx.fillStyle = 'rgba(108, 117, 125, 0.15)';
                                        ctx.fillRect(
                                            startX,
                                            chartArea.top,
                                            endX - startX,
                                            chartArea.bottom - chartArea.top
                                        );
                                    }
                                    
                                    i = recessionEnd + 1;
                                } else {
                                    i++;
                                }
                            }
                        } else {
                            // Multiple countries - use availableCountries and consistent colors
                            const availableCountries = chart.config._config.availableCountries || [];
                            
                            availableCountries.forEach((country, countryIndex) => {
                                const countryColor = visualizer.getAvailableCountryColor(country, availableCountries);
                                
                                let i = 0;
                                while (i < filteredData.length) {
                                    const dataPoint = filteredData[i];
                                    
                                    // Always use latest data for recession bands, even in real-time mode
                                    let recessionData;
                                    if (estimationMode === 'realtime') {
                                        const latestCountryData = visualizer.countryData[country]?.data.find(row => row.Time === dataPoint.Time);
                                        recessionData = latestCountryData || dataPoint[country];
                                    } else {
                                        recessionData = dataPoint[country];
                                    }
                                    
                                    if (recessionData && recessionData.Recession === 1) {
                                        let recessionStart = i;
                                        let recessionEnd = i;
                                        
                                        while (recessionEnd < filteredData.length - 1) {
                                            const nextDataPoint = filteredData[recessionEnd + 1];
                                            let nextRecessionData;
                                            
                                            if (estimationMode === 'realtime') {
                                                const nextLatestData = visualizer.countryData[country]?.data.find(row => row.Time === nextDataPoint.Time);
                                                nextRecessionData = nextLatestData || nextDataPoint[country];
                                            } else {
                                                nextRecessionData = nextDataPoint[country];
                                            }
                                            
                                            if (nextRecessionData && nextRecessionData.Recession === 1) {
                                                recessionEnd++;
                                            } else {
                                                break;
                                            }
                                        }
                                        
                                        let shadingStart = Math.max(0, recessionStart - 1);
                                        let shadingEnd = recessionEnd;
                                        
                                        for (let j = shadingStart; j < shadingEnd; j++) {
                                            const startX = scales.x.getPixelForValue(j);
                                            const endX = scales.x.getPixelForValue(j + 1);
                                            
                                            ctx.fillStyle = hexToRgba(countryColor, 0.25);
                                            ctx.fillRect(
                                                startX,
                                                chartArea.top,
                                                endX - startX,
                                                chartArea.bottom - chartArea.top
                                            );
                                        }
                                        
                                        i = recessionEnd + 1;
                                    } else {
                                        i++;
                                    }
                                }
                            });
                        }
                        
                        ctx.restore();
                    }
                }
            ]
        });

        this.chart.config._config.filteredData = filteredData;
        this.chart.config._config.visualizer = this;
        this.chart.config._config.selectedCountries = this.selectedCountries;
        this.chart.config._config.availableCountries = this.currentAvailableCountries;
        this.chart.config._config.estimationMode = this.estimationMode;

        if (skipAnimation) {
            this.chart.data = chartData;
            this.chart.update('none');
        } else {
            chartData.datasets.forEach((dataset, index) => {
                setTimeout(() => {
                    this.chart.data.datasets[index].data = dataset.data;
                    this.chart.update('none');
                }, index * 50);
            });
        }
    }

    prepareChartData(filteredData) {
        const labels = filteredData.map(row => row.Time);
        
        // Get countries that actually have data (not just selected countries)
        const availableCountries = this.selectedCountries.filter(country => {
            // Check if this country appears in the filtered data
            return filteredData.some(row => row[country] !== undefined);
        });
        
        this.currentAvailableCountries = availableCountries;        
        const isSingleCountry = availableCountries.length === 1;

        // Single Country - Both Modes
        if (isSingleCountry && this.estimationMode === 'both') {
            const country = availableCountries[0];
            return {
                labels: labels,
                datasets: [
                    {
                        label: 'Upper Bound (p95)',
                        data: filteredData.map(row => row[country] ? row[country].RecessionRisk_p95 : null),
                        borderColor: 'transparent',
                        backgroundColor: `${this.colorPalette[0]}26`,
                        fill: '+1',
                        tension: 0.2,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        order: 6
                    },
                    {
                        label: `${this.countryLabels[country]} (Latest)`,
                        data: filteredData.map(row => row[country] ? row[country].RecessionRisk_p50 : null),
                        borderColor: this.colorPalette[0],
                        backgroundColor: `${this.colorPalette[0]}26`,
                        borderWidth: 1.8,
                        fill: '+1',
                        tension: 0.2,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        order: 1
                    },
                    {
                        label: 'Lower Bound (p05)',
                        data: filteredData.map(row => row[country] ? row[country].RecessionRisk_p05 : null),
                        borderColor: 'transparent',
                        backgroundColor: 'rgba(0, 0, 0, 0)',
                        fill: 'origin',
                        tension: 0.2,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        order: 5
                    },
                    {
                        label: 'Upper Bound Real-Time (p95)',
                        data: filteredData.map(row => row[`${country}_OOS`] ? row[`${country}_OOS`].RecessionRisk_p95 : null),
                        borderColor: 'transparent',
                        backgroundColor: `${this.colorPalette[0]}26`,
                        fill: '+1',
                        tension: 0.2,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        order: 4
                    },
                    {
                        label: `${this.countryLabels[country]} (Real-Time)`,
                        data: filteredData.map(row => row[`${country}_OOS`] ? row[`${country}_OOS`].RecessionRisk_p50 : null),
                        borderColor: this.colorPalette[0],
                        backgroundColor: `${this.colorPalette[0]}26`,
                        borderWidth: 1.8,
                        borderDash: [5, 2],
                        fill: '+1',
                        tension: 0.2,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        order: 2
                    },
                    {
                        label: 'Lower Bound Real-Time (p05)',
                        data: filteredData.map(row => row[`${country}_OOS`] ? row[`${country}_OOS`].RecessionRisk_p05 : null),
                        borderColor: 'transparent',
                        backgroundColor: 'rgba(0, 0, 0, 0)',
                        fill: 'origin',
                        tension: 0.2,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        order: 3
                    }
                ]
            };

        // Single Country - Latest or Real-time    
        } else if (isSingleCountry) {
            const country = availableCountries[0];
            const modeLabel = this.estimationMode === 'realtime' ? ' (Real-Time)' : '';
            
            const chartColor = this.getAvailableCountryColor(country, availableCountries);
            
            return {
                labels: labels,
                datasets: [
                    {
                        label: 'Upper Bound (p95)',
                        data: filteredData.map(row => {
                            const data = row[country];
                            return data ? data.RecessionRisk_p95 : null;
                        }),
                        borderColor: 'transparent',
                        backgroundColor: `${chartColor}26`,
                        fill: '+1',
                        tension: 0.2,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        order: 3
                    },
                    {
                        label: `${this.countryLabels[country]}${modeLabel}`,
                        data: filteredData.map(row => {
                            const data = row[country];
                            return data ? data.RecessionRisk_p50 : null;
                        }),
                        borderColor: chartColor,
                        backgroundColor: `${chartColor}26`,
                        borderWidth: this.estimationMode === 'realtime' ? 1.8 : 1.8,
                        borderDash: this.estimationMode === 'realtime' ? [5, 2] : [],
                        fill: '+1',
                        tension: 0.2,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        order: 1
                    },
                    {
                        label: 'Lower Bound (p05)',
                        data: filteredData.map(row => {
                            const data = row[country];
                            return data ? data.RecessionRisk_p05 : null;
                        }),
                        borderColor: 'transparent',
                        backgroundColor: 'rgba(0, 0, 0, 0)',
                        fill: 'origin',
                        tension: 0.2,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        order: 2
                    }
                ]
            };
        // Multiple Country - Both Modes
        } else {
            // Multiple countries
            const datasets = [];
            const modeLabel = this.estimationMode === 'realtime' ? ' (Real-Time)' : '';
            
            availableCountries.forEach((country, index) => {
                const baseOrder = index * 3;
                
                // Upper bound (p95)
                datasets.push({
                    label: `${this.countryLabels[country]} Upper (p95)`,
                    data: filteredData.map(row => row[country] ? row[country].RecessionRisk_p95 : null),
                    borderColor: 'transparent',
                    backgroundColor: `${this.getAvailableCountryColor(country, availableCountries)}20`,
                    fill: `+1`,
                    tension: 0.2,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    order: baseOrder + 3
                });
                
                // Median line
                datasets.push({
                    label: `${this.countryLabels[country]}${modeLabel}`,
                    data: filteredData.map(row => row[country] ? row[country].RecessionRisk_p50 : null),
                    borderColor: this.getAvailableCountryColor(country, availableCountries),
                    backgroundColor: `${this.getAvailableCountryColor(country, availableCountries)}20`,
                    borderWidth: this.estimationMode === 'realtime' ? 1.8 : 1.8,
                    borderDash: this.estimationMode === 'realtime' ? [5, 2] : [],
                    fill: `+1`,
                    tension: 0.2,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    order: baseOrder + 1
                });
                
                // Lower bound (p05)
                datasets.push({
                    label: `${this.countryLabels[country]} Lower (p05)`,
                    data: filteredData.map(row => row[country] ? row[country].RecessionRisk_p05 : null),
                    borderColor: 'transparent',
                    backgroundColor: 'rgba(0, 0, 0, 0)',
                    fill: index === 0 ? 'origin' : false,
                    tension: 0.2,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    order: baseOrder + 2
                });
            });

            return {
                labels: labels,
                datasets: datasets
            };
        }
    }    

    updateChart() {
        // Don't update chart if we're in error state
        if (this.hasOOSError) {
            return;
        }
        
        const filteredData = this.getFilteredData();
        if (filteredData.length === 0) {
            return;
        }
        
        this.createChart(true);
        this.showStats();
        this.showHeaderStats();
    }

    showStats() {
        // Don't show stats if we're in error state
        if (this.hasOOSError) {
            const currentMonthEl = document.getElementById('current-month-stat');
            const lastMonthEl = document.getElementById('last-month-stat');
            if (currentMonthEl) {
                currentMonthEl.innerHTML = `<div class="stat-value">--</div><div class="stat-range">--</div>`;
            }
            if (lastMonthEl) {
                lastMonthEl.innerHTML = `<div class="stat-value">--</div><div class="stat-range">--</div>`;
            }
            return;
        }

        // Always show stats from latest estimates (unchanged behavior)
        const allTimePoints = this.getAllTimePoints();
        if (allTimePoints.length === 0) {
            const currentMonthEl = document.getElementById('current-month-stat');
            const lastMonthEl = document.getElementById('last-month-stat');
            if (currentMonthEl) {
                currentMonthEl.innerHTML = `<div class="stat-value">--</div><div class="stat-range">--</div>`;
            }
            if (lastMonthEl) {
                lastMonthEl.innerHTML = `<div class="stat-value">--</div><div class="stat-range">--</div>`;
            }
            return;
        }

        // Get the latest available data points from latest estimates (not filtered by time selection)
        const latestTimePoints = allTimePoints.slice(-2);
        const latestDataPoints = latestTimePoints.map(timePoint => {
            const dataPoint = { Time: timePoint };
            this.selectedCountries.forEach(country => {
                // Always use latest estimates for stats
                const countryData = this.countryData[country]?.data.find(row => row.Time === timePoint);
                dataPoint[country] = countryData || null;
            });
            return dataPoint;
        });

        const currentMonth = latestDataPoints[latestDataPoints.length - 1];
        const lastMonth = latestDataPoints.length > 1 ? latestDataPoints[latestDataPoints.length - 2] : null;

        const currentMonthEl = document.getElementById('current-month-stat');
        const lastMonthEl = document.getElementById('last-month-stat');

        if (this.selectedCountries.length === 1) {
            // Single country stats
            const country = this.selectedCountries[0];
            const currentData = currentMonth[country];
            const lastData = lastMonth ? lastMonth[country] : null;

            if (currentMonthEl && currentData) {
                currentMonthEl.innerHTML = `
                    <div class="stat-period"><strong>${currentMonth.Time}</strong></div>
                    <div class="stat-value">${(currentData.RecessionRisk_p50 * 100).toFixed(1)}%</div>
                    <div class="stat-range">[${(currentData.RecessionRisk_p05 * 100).toFixed(1)}% - ${(currentData.RecessionRisk_p95 * 100).toFixed(1)}%]</div>
                `;
            }

            if (lastMonthEl) {
                if (lastData) {
                    lastMonthEl.innerHTML = `
                        <div class="stat-period"><strong>${lastMonth.Time}</strong></div>
                        <div class="stat-value">${(lastData.RecessionRisk_p50 * 100).toFixed(1)}%</div>
                        <div class="stat-range">[${(lastData.RecessionRisk_p05 * 100).toFixed(1)}% - ${(lastData.RecessionRisk_p95 * 100).toFixed(1)}%]</div>
                    `;
                } else {
                    lastMonthEl.innerHTML = `<div class="stat-value">--</div><div class="stat-range">--</div>`;
                }
            }
        } else {
            // Multiple countries stats
            if (currentMonthEl) {
                let html = `<div class="stat-period"><strong>${currentMonth.Time}</strong></div><div class="multi-country-stats">`;
                this.selectedCountries.forEach(country => {
                    const data = currentMonth[country];
                    if (data) {
                        html += `
                            <div class="country-stat-row">
                                <span class="country-name">${this.countryLabels[country]}</span>
                                <span class="country-value">${(data.RecessionRisk_p50 * 100).toFixed(1)}%</span>
                            </div>
                        `;
                    }
                });
                html += '</div>';
                currentMonthEl.innerHTML = html;
            }

            if (lastMonthEl && lastMonth) {
                let html = `<div class="stat-period"><strong>${lastMonth.Time}</strong></div><div class="multi-country-stats">`;
                this.selectedCountries.forEach(country => {
                    const data = lastMonth[country];
                    if (data) {
                        html += `
                            <div class="country-stat-row">
                                <span class="country-name">${this.countryLabels[country]}</span>
                                <span class="country-value">${(data.RecessionRisk_p50 * 100).toFixed(1)}%</span>
                            </div>
                        `;
                    }
                });
                html += '</div>';
                lastMonthEl.innerHTML = html;
            } else if (lastMonthEl) {
                lastMonthEl.innerHTML = `<div class="stat-value">--</div><div class="stat-range">--</div>`;
            }
        }
    }

    showHeaderStats() {
        // Don't show stats if we're in error state
        if (this.hasOOSError) {
            const headerStatsEl = document.getElementById('header-latest-stats');
            const headerPrevStatsEl = document.getElementById('header-prev-stats');
            if (headerStatsEl) {
                headerStatsEl.textContent = 'Latest: --';
            }
            if (headerPrevStatsEl) {
                headerPrevStatsEl.textContent = 'Previous: --';
            }
            return;
        }

        // Always show stats from latest estimates (unchanged behavior)
        const allTimePoints = this.getAllTimePoints();
        if (allTimePoints.length === 0) {
            const headerStatsEl = document.getElementById('header-latest-stats');
            const headerPrevStatsEl = document.getElementById('header-prev-stats');
            if (headerStatsEl) {
                headerStatsEl.textContent = 'Latest: --';
            }
            if (headerPrevStatsEl) {
                headerPrevStatsEl.textContent = 'Previous: --';
            }
            return;
        }

        // Get the latest and previous available data points from latest estimates
        const latestTimePoint = allTimePoints[allTimePoints.length - 1];
        const prevTimePoint = allTimePoints.length > 1 ? allTimePoints[allTimePoints.length - 2] : null;
        
        const latestDataPoint = { Time: latestTimePoint };
        this.selectedCountries.forEach(country => {
            const countryData = this.countryData[country]?.data.find(row => row.Time === latestTimePoint);
            latestDataPoint[country] = countryData || null;
        });

        // Latest month stats
        const headerStatsEl = document.getElementById('header-latest-stats');
        if (headerStatsEl) {
            let statsText = `<strong>${latestTimePoint} (Latest):</strong> `;
            
            const countryStats = [];
            this.selectedCountries.forEach(country => {
                const data = latestDataPoint[country];
                if (data) {
                    const countryName = this.countryLabels[country] || country;
                    countryStats.push(`<strong>${countryName} ${(data.RecessionRisk_p50 * 100).toFixed(1)}%</strong>`);
                }
            });
            
            if (countryStats.length > 0) {
                statsText += countryStats.join(' | ');
            } else {
                statsText = 'Latest: --';
            }
            
            headerStatsEl.innerHTML = statsText;
        }

        // Previous month stats
        const headerPrevStatsEl = document.getElementById('header-prev-stats');
        if (headerPrevStatsEl && prevTimePoint) {
            const prevDataPoint = { Time: prevTimePoint };
            this.selectedCountries.forEach(country => {
                const countryData = this.countryData[country]?.data.find(row => row.Time === prevTimePoint);
                prevDataPoint[country] = countryData || null;
            });

            let prevStatsText = `<strong>${prevTimePoint} (Previous):</strong> `;
            
            const prevCountryStats = [];
            this.selectedCountries.forEach(country => {
                const data = prevDataPoint[country];
                if (data) {
                    const countryName = this.countryLabels[country] || country;
                    prevCountryStats.push(`<strong>${countryName} ${(data.RecessionRisk_p50 * 100).toFixed(1)}%</strong>`);
                }
            });
            
            if (prevCountryStats.length > 0) {
                prevStatsText += prevCountryStats.join(' | ');
            } else {
                prevStatsText = 'Previous: --';
            }
            
            headerPrevStatsEl.innerHTML = prevStatsText;
        } else if (headerPrevStatsEl) {
            headerPrevStatsEl.innerHTML = 'Previous: --';
        }
    }     

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('chart-section').style.display = 'block';
    }

    debugOOSData() {
        console.log('=== OOS Data Debug ===');
        console.log('Selected countries:', this.selectedCountries);
        console.log('Estimation mode:', this.estimationMode);
        
        this.selectedCountries.forEach(country => {
            console.log(`${country}:`);
            console.log('  - Latest data available:', !!this.countryData[country]);
            console.log('  - OOS data available:', !!this.countryDataOOS[country]);
            
            if (this.countryDataOOS[country]) {
                console.log('  - OOS data length:', this.countryDataOOS[country].data.length);
                console.log('  - OOS sample data:', this.countryDataOOS[country].data.slice(0, 2));
            }
        });
        
        const filteredData = this.getFilteredData();
        console.log('Filtered data sample:', filteredData.slice(0, 3));
    }

    showError(message) {
        document.getElementById('loading').style.display = 'none';
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

// Tab switching functionality
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all tabs and buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
}

// Initialize tabs when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    new RecessionRiskVisualizer();
});
        


// Image modal functionality for FAQ images
document.addEventListener('DOMContentLoaded', function() {
    // Create modal elements
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <span class="image-modal-close">&times;</span>
        <img class="image-modal-content" alt="">
    `;
    document.body.appendChild(modal);

    const modalImg = modal.querySelector('.image-modal-content');
    const closeBtn = modal.querySelector('.image-modal-close');

    // Add click listeners to all FAQ images
    document.querySelectorAll('.faq-image').forEach(img => {
        img.addEventListener('click', function() {
            modal.style.display = 'block';
            modalImg.src = this.src;
            modalImg.alt = this.alt;
        });
    });

    // Close modal when clicking the X or outside the image
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    });
});