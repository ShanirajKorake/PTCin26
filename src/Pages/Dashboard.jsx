import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, Truck, BadgeIndianRupee, Users, Calendar, TrendingUp, ChevronsDown } from 'lucide-react';
import { getInvoicesHistory } from '../services/dbService';
import logo from '../assets/logo.jpg';
import MainStats from '../components/refurbished/MainStats';

// --- CONFIG ---
const DAYS_FOR_STATS = 30;
const TOP_N_PARTIES = 5;

// --- STATS CALCULATION FUNCTION (unchanged for brevity) ---
const calculateStats = (history) => {
    if (!history || history.length === 0) {
        return {
            totalRevenue: 0,
            last30DaysRevenue: 0,
            last30DaysTrips: 0,
            topDueParties: [],
            totalDueAmount: 0,
            recentTrips: [],
            topTripsParties: [],
            totalTrips: 0,
        };
    }

    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime());
    thirtyDaysAgo.setDate(today.getDate() - DAYS_FOR_STATS);

    let last30DaysRevenue = 0;
    let last30DaysTrips = 0;
    let totalRevenue = 0;
    let totalDueAmount = 0;
    const duePartiesMap = new Map();
    const partyTripCountMap = new Map();
    const recentTrips = [];
    let totalTrips = history.length;

    history.forEach(invoice => {
        const billDate = new Date(invoice.formData.billDate);
        const invoiceTotalFreight = parseFloat(invoice.summary.totalFreight || 0);
        const invoiceBalance = parseFloat(invoice.summary.totalBalance || 0);
        totalRevenue += invoiceTotalFreight;

        if (billDate >= thirtyDaysAgo) {
            last30DaysRevenue += invoiceTotalFreight;
            last30DaysTrips += 1;
        }

        if (invoiceBalance > 0.01) {
            totalDueAmount += invoiceBalance;
            const partyName = invoice.formData.partyName;
            const currentDue = duePartiesMap.get(partyName) || 0;
            duePartiesMap.set(partyName, currentDue + invoiceBalance);
        }

        recentTrips.push({
            id: invoice.id,
            date: billDate,
            party: invoice.formData.partyName,
            balance: invoiceBalance,
            invoiceNo: invoice.formData.invoiceNo,
            from: invoice.formData.from,
            to: invoice.formData.to,
        });

        const currentCount = partyTripCountMap.get(invoice.formData.partyName) || 0;
        partyTripCountMap.set(invoice.formData.partyName, currentCount + 1);
    });

    const topDueParties = Array.from(duePartiesMap.entries())
        .map(([party, totalDue]) => ({ party, totalDue }))
        .sort((a, b) => b.totalDue - a.totalDue)
        .slice(0, TOP_N_PARTIES)
        .filter(p => p.totalDue > 0);

    const topTripsParties = Array.from(partyTripCountMap.entries())
        .map(([party, trips]) => ({ party, trips }))
        .sort((a, b) => b.trips - a.trips)
        .slice(0, TOP_N_PARTIES);

    recentTrips.sort((a, b) => b.date - a.date);

    console.log(recentTrips)

    return {
        totalRevenue,
        last30DaysRevenue,
        last30DaysTrips,
        topDueParties,
        totalDueAmount,
        recentTrips: recentTrips.slice(0, 5),
        topTripsParties,
        totalTrips,
    };
};

// --- STAT CARD ---
const StatCard = ({ icon: Icon, title, value, isCurrency, color, theme }) => {
    const formattedValue = isCurrency
        ? `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
        : value.toLocaleString('en-IN');

    const isLight = theme === 'light';
    const bg = isLight ? 'bg-white' : 'bg-gray-800';
    const text = isLight ? 'text-gray-900' : 'text-white';

    return (
        <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className={`p-5 rounded-2xl ${bg} shadow-md transition-all border border-transparent hover:border-${color}-400/50 hover:shadow-${color}-400/30 flex flex-col justify-between`}
        >
            <div className="flex items-center mb-2 text-gray-500">
                <Icon className={`mr-2 text-${color}-500`} />
                <h4 className="text-sm font-semibold">{title}</h4>
            </div>
            <p className={`text-4xl font-extrabold ${text}`}>{formattedValue}</p>
        </motion.div>
    );
};

// --- MAIN COMPONENT ---
export default function Dashboard({ theme, handleNavigateToHistory }) {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const newContainerClasses = theme === "dark" ? "bg-gray-800" : "bg-white shadow-sm"

    const isLight = theme === 'light';
    const bg = isLight ? 'bg-gray-50 text-gray-800' : 'bg-gray-900 text-gray-100';
    const cardBg = isLight ? 'bg-white' : 'bg-gray-800';
    const accent = isLight ? 'text-indigo-600' : 'text-indigo-400';

    const fetchAndCalculate = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const history = await getInvoicesHistory();
            setStats(calculateStats(history));
        } catch (err) {
            console.error(err);
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAndCalculate();
    }, [fetchAndCalculate]);

    // --- LOADING & ERROR STATES ---
    if (isLoading || error || !stats) {
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center ${bg}`}>
                {isLoading ? (
                    <>
                        <Loader2 className={`animate-spin mb-4 ${accent}`} size={48} />
                        <h2 className="text-2xl font-semibold">Loading insights...</h2>
                        <p className="text-gray-500 mt-2">Fetching recent invoice history</p>
                    </>
                ) : (
                    <div className={`text-center p-6 rounded-2xl shadow-lg ${cardBg}`}>
                        <p className="text-5xl mb-4">🚨</p>
                        <p className="text-xl font-semibold text-red-500 mb-2">Data Load Failed</p>
                        <p className="text-gray-400 mb-4">{error}</p>
                        <button
                            onClick={fetchAndCalculate}
                            className="bg-red-600 text-white px-4 py-2 rounded-xl flex items-center justify-center mx-auto hover:bg-red-700"
                        >
                            <RefreshCw className="mr-2" size={18} /> Retry
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`min-h-screen p-6 ${bg}`}>
            {/* HEADER */}
            <div className="flex flex-col items-center my-10">
                <motion.img
                    src={logo}
                    alt="Company Logo"
                    className={`w-30 h-30 rounded-full shadow-xl border-3 ${isLight ? 'border-gray-300' : 'border-gray-500'}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6 }}
                />
            </div>

            <div className="max-w-6xl mx-auto gap-2 flex flex-col">
                {/* METRICS GRID */}

                <MainStats theme={theme} color="green" stats={stats} />

                {/* PARTY ANALYSIS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {/* DUE PARTIES */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        viewport={{ once: true }}
                        className={` overflow-clip rounded-3xl shadow-sm `}

                    >
                        <h3 className={`text-xl font-bold flex items-center w-full p-2 mb-0.5 justify-center ${newContainerClasses}`}>
                            <ChevronsDown className={`mr-2 text-red-500 `} /> Top Due Parties
                        </h3>
                        {stats.topDueParties.length ? (
                            <ul className="divide-y divide-gray-200/20 ">
                                {stats.topDueParties.map((p, i) => (
                                    <li key={i} >
                                        <button
                                            className={`flex w-full ${newContainerClasses}`}
                                            onClick={() => { handleNavigateToHistory(p.party, "party", "unpaid") }}
                                        >

                                            <span className={`p-4 py-2 `}>{i + 1} </span>
                                            <span className={` flex-[80%] p-4 py-2 text-wrap`}> {p.party}</span>
                                            <span className={`font-semibold text-red-500 flex-1 p-4 py-2`}>
                                                ₹{p.totalDue.toLocaleString('en-IN')}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-400">No dues found</p>
                        )}
                    </motion.div>

                    {/* FREQUENT CLIENTS */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        viewport={{ once: true }}
                        className={` overflow-clip rounded-3xl shadow-sm `}
                    >
                        <h3 className={`text-xl font-bold flex items-center w-full p-2 mb-0.5 justify-center ${newContainerClasses}`}>
                            <Users className="mr-2 text-indigo-500" /> Frequent Parties
                        </h3>
                        <ul className="divide-y divide-gray-200/20">
                            {stats.topTripsParties.map((p, i) => (
                                <li key={i} >
                                    <button
                                        className={`flex w-full ${newContainerClasses}`}
                                        onClick={() => { handleNavigateToHistory(p.party, "party", "all") }}
                                    >
                                        <span className={`p-4 py-2 `}>{i + 1}</span>
                                        <span className={` flex-[80%] p-4 py-2 text-wrap`}>{p.party}</span>
                                        <span className={`font-semibold text-red-500 flex-1 p-4 py-2 text-nowrap`}>{p.trips} Trips</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                </div>

                {/* RECENT TRIPS */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                    viewport={{ once: true }}
                    className={` overflow-clip rounded-3xl shadow-sm `}
                >
                    <h3 className={`text-xl font-bold flex items-center w-full p-2 mb-0.5 justify-center ${newContainerClasses}`}>
                        <Calendar className="mr-2 text-green-500" /> Recent Trips
                    </h3>
                    <ul className="divide-y divide-gray-200/20">
                        {stats.recentTrips.map((trip, i) => (
                            <li key={i} >
                                <button
                                        className={`flex w-full ${newContainerClasses}`}
                                        onClick={() => { handleNavigateToHistory(trip.id, "trip", null) }}
                                    >
                                <div className='flex-7 p-2 px-4 text-left'>
                                    <p className="font-medium">{trip.party} ({trip.invoiceNo})</p>
                                    <p className="text-gray-400 text-xs">{trip.from} → {trip.to}</p>
                                </div>
                                <div className="text-right p-2 px-4 items-center align-middle h-full">
                                    <p className={`font-semibold ${trip.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                        {trip.balance > 0 ? `₹${trip.balance}` : 'PAID'}
                                    </p>
                                    <p className="text-gray-400 text-xs">{new Date(trip.date).toLocaleDateString()}</p>
                                </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </motion.div>
            </div>
        </div>
    );
}
