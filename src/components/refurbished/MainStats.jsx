import { BadgeIndianRupee, Calendar, ChevronsDown, Truck } from 'lucide-react'
import React from 'react'

export default function MainStats({ theme, color, stats }) {
  const statItems = [
    {
      icon: BadgeIndianRupee,
      iconColor: color,
      label: 'Total Revenue',
      value: stats.totalRevenue,
      isRupee: true
    },
    {
      icon: Calendar,
      iconColor: 'blue',
      label: 'Last 30 Days Revenue',
      value: stats.last30DaysRevenue,
      isRupee: true
    },
    {
      icon: ChevronsDown,
      iconColor: 'red',
      label: 'Total Due Amount',
      value: stats.totalDueAmount,
      isRupee: true
    },
    {
      icon: Truck,
      iconColor: 'purple',
      label: 'Last 30 Days Trips',
      value: stats.last30DaysTrips,
      isRupee: false
    }
  ]

  const formatValue = (value, isRupee) => {
    const formatted = value.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    return isRupee ? `₹${formatted}` : formatted
  }

  return (
    <div 
      className={`py-4 px-6 rounded-3xl ${theme === "dark" ? "bg-gray-800" : "bg-white shadow-sm"}`}
    >
      <div className="">
        {statItems.map((item, index) => {
          const Icon = item.icon
          return (
            <div 
              key={index}
              className={`py-2 ${index !== statItems.length - 1 ? 'border-b border-gray-400 ' : ''}`}
            >
              <div className="flex items-center gap-2 ">
                <div className={`p-2 rounded-xl `}>
                  <Icon 
                    className={`w-5 h-5 text-${item.iconColor}-500`}
                    strokeWidth={2.5}
                  />
                </div>
                <p className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  {item.label}
                </p>
              </div>
              <h1 className={`text-3xl font-bold m-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {formatValue(item.value, item.isRupee)}
              </h1>
            </div>
          )
        })}
      </div>
    </div>
  )
}