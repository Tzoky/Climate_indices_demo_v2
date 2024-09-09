/* @jsx React.createElement */
const { useState, useEffect } = React;
const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = Recharts;

const ClimateAnalysisApp = () => {
    const [data, setData] = useState([]);
    const [processedData, setProcessedData] = useState([]);
    const [error, setError] = useState('');
    const [analysisType, setAnalysisType] = useState('TX');
    const [periodType, setPeriodType] = useState('year');
    const [calculationType, setCalculationType] = useState('average');
    const [threshold, setThreshold] = useState(0);
    const [startYear, setStartYear] = useState(2010);
    const [endYear, setEndYear] = useState(2020);
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [selectedSeason, setSelectedSeason] = useState('all');

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            Papa.parse(file, {
                header: false,
                dynamicTyping: true,
                complete: (results) => {
                    if (results.errors.length > 0) {
                        setError('שגיאה בניתוח הקובץ');
                    } else {
                        setError(null);
                        const formattedData = results.data.map(row => ({
                            year: row[0],
                            month: row[1],
                            day: row[2],
                            TX: row[3],
                            TN: row[4]
                        }));
                        setData(formattedData);
                    }
                }
            });
        }
    };

    const processData = () => {
        let filteredData = data.filter(row => 
            row.year >= startYear && row.year <= endYear
        );

        if (selectedMonth !== 'all') {
            filteredData = filteredData.filter(row => row.month === parseInt(selectedMonth));
        }

        if (selectedSeason !== 'all') {
            const seasonMonths = {
                'spring': [3, 4, 5],
                'summer': [6, 7, 8],
                'autumn': [9, 10, 11],
                'winter': [12, 1, 2]
            };
            filteredData = filteredData.filter(row => seasonMonths[selectedSeason].includes(row.month));
        }

        let result;
        if (periodType === 'year') {
            result = computeAnnualMetrics(filteredData);
        } else if (periodType === 'season') {
            result = computeSeasonalMetrics(filteredData);
        } else if (periodType === 'month') {
            result = computeMonthlyMetrics(filteredData);
        }

        setProcessedData(result);
    };

    const computeMetrics = (data) => {
        const values = data.map(row => row[analysisType]);
        let value;

        if (calculationType === 'average') {
            value = values.reduce((sum, val) => sum + val, 0) / values.length;
        } else if (calculationType === 'aboveThreshold') {
            value = values.filter(val => val > threshold).length;
        } else if (calculationType === 'belowThreshold') {
            value = values.filter(val => val < threshold).length;
        }

        return value;
    };

    const computeAnnualMetrics = (data) => {
        const annualData = {};

        data.forEach(row => {
            if (!annualData[row.year]) {
                annualData[row.year] = [];
            }
            annualData[row.year].push(row);
        });

        return Object.keys(annualData).map(year => ({
            year: parseInt(year),
            value: computeMetrics(annualData[year])
        }));
    };

    const computeSeasonalMetrics = (data) => {
        const seasonalData = {};
        const seasons = ['winter', 'spring', 'summer', 'autumn'];
        const seasonMonths = {
            'winter': [12, 1, 2],
            'spring': [3, 4, 5],
            'summer': [6, 7, 8],
            'autumn': [9, 10, 11]
        };

        data.forEach(row => {
            const year = row.year;
            const season = seasons.find(s => seasonMonths[s].includes(row.month));
            const key = `${year}-${season}`;
            if (!seasonalData[key]) {
                seasonalData[key] = [];
            }
            seasonalData[key].push(row);
        });

        return Object.keys(seasonalData).map(key => {
            const [year, season] = key.split('-');
            return {
                year: parseInt(year),
                season: season,
                value: computeMetrics(seasonalData[key])
            };
        });
    };

    const computeMonthlyMetrics = (data) => {
        const monthlyData = {};

        data.forEach(row => {
            const key = `${row.year}-${row.month}`;
            if (!monthlyData[key]) {
                monthlyData[key] = [];
            }
            monthlyData[key].push(row);
        });

        return Object.keys(monthlyData).map(key => {
            const [year, month] = key.split('-');
            return {
                year: parseInt(year),
                month: parseInt(month),
                value: computeMetrics(monthlyData[key])
            };
        });
    };

    useEffect(() => {
        if (data.length > 0) {
            processData();
        }
    }, [data, analysisType, periodType, calculationType, threshold, startYear, endYear, selectedMonth, selectedSeason]);

    const downloadChartData = () => {
        const csv = Papa.unparse(processedData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "chart_data.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">ניתוח אקלים</h1>
            
            <div className="mb-4">
                <label className="block mb-2">העלאת קובץ נתונים:</label>
                <input type="file" onChange={handleFileUpload} className="border p-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block mb-2">סוג ניתוח:</label>
                    <select className="border p-2 w-full" value={analysisType} onChange={(e) => setAnalysisType(e.target.value)}>
                        <option value="TX">טמפרטורת מקסימום (TX)</option>
                        <option value="TN">טמפרטורת מינימום (TN)</option>
                    </select>
                </div>
                <div>
                    <label className="block mb-2">סוג תקופה:</label>
                    <select className="border p-2 w-full" value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
                        <option value="year">שנתי</option>
                        <option value="season">עונתי</option>
                        <option value="month">חודשי</option>
                    </select>
                </div>
                <div>
                    <label className="block mb-2">סוג חישוב:</label>
                    <select className="border p-2 w-full" value={calculationType} onChange={(e) => setCalculationType(e.target.value)}>
                        <option value="average">ממוצע</option>
                        <option value="aboveThreshold">מעל הסף</option>
                        <option value="belowThreshold">מתחת לסף</option>
                    </select>
                </div>
                <div>
                    <label className="block mb-2">סף (°C):</label>
                    <input type="number" value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value))} className="border p-2 w-full" />
                </div>
            </div>
            
            <div className="mb-4">
                <label className="mr-2">שנת התחלה:</label>
                <input type="number" value={startYear} onChange={(e) => setStartYear(parseInt(e.target.value))} className="border p-2 mr-4" />
                <label className="mr-2">שנת סיום:</label>
                <input type="number" value={endYear} onChange={(e) => setEndYear(parseInt(e.target.value))} className="border p-2" />
            </div>

            <div className="mb-4">
                <label className="mr-2">חודש:</label>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border p-2 mr-4">
                    <option value="all">כל החודשים</option>
                    <option value="1">ינואר</option>
                    <option value="2">פברואר</option>
                    <option value="3">מרץ</option>
                    <option value="4">אפריל</option>
                    <option value="5">מאי</option>
                    <option value="6">יוני</option>
                    <option value="7">יולי</option>
                    <option value="8">אוגוסט</option>
                    <option value="9">ספטמבר</option>
                    <option value="10">אוקטובר</option>
                    <option value="11">נובמבר</option>
                    <option value="12">דצמבר</option>
                </select>

                <label className="mr-2">עונה:</label>
                <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)} className="border p-2">
                    <option value="all">כל העונות</option>
                    <option value="spring">אביב</option>
                    <option value="summer">קיץ</option>
                    <option value="autumn">סתיו</option>
                    <option value="winter">חורף</option>
                </select>
            </div>
            
            {error && <div className="text-red-500 mb-4">{error}</div>}
            
            <div className="mb-4" style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                    <LineChart data={processedData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#8884d8" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            
            <button onClick={downloadChartData} className="bg-blue-500 text-white px-4 py-2 rounded">
                הורד נתוני תרשים
            </button>
        </div>
    );
};

ReactDOM.render(<ClimateAnalysisApp />, document.getElementById('root'));
