import React from 'react'

export default function ThumbsUp() {
  return (
    <div className="thumbs-up" data-id="thumbs-up">
      <svg viewBox="0 0 120 100" className="thumbs-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="thumbGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff86c8"/>
            <stop offset="100%" stopColor="#7b61ff"/>
          </linearGradient>
        </defs>
        <path d="M20 55 c0 -20 20 -35 35 -35 h15 c6 0 10 5 8 11 l-6 20 h18 c5 0 10 5 10 10 v15 c0 6 -5 10 -10 10 h-55 c-8 0 -15 -7 -15 -15 v-16 c0 -8 7 -10 10 -10 z" fill="url(#thumbGrad)" stroke="#502d9d" strokeWidth="3"/>
      </svg>
    </div>
  )
}