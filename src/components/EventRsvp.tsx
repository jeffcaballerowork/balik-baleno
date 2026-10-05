import { useState } from "react"

import Icon from "./Icon"

import { events } from "../data/mock"

export default function EventRsvp() {
  const [rsvps, setRsvps] = useState<number[]>([])

  return (
    <div className="events-list">
      {events.map((event, index) => (
        <article className="event-list-card" key={event.title}>
          <div className="event-date">
            <span>{event.month}</span>
            <strong>{event.day}</strong>
          </div>
          <div className="event-list-body">
            <span className="event-label">{event.category}</span>
            <h2>{event.title}</h2>
            <p className="event-detail">
              <Icon name="calendar" size={16} /> {event.detail}
            </p>
            <p>{event.description}</p>
          </div>
          <button
            className={`button ${
              rsvps.includes(index) ? "button-confirmed" : "button-outline"
            }`}
            onClick={() =>
              setRsvps((previous) =>
                previous.includes(index)
                  ? previous.filter((item) => item !== index)
                  : [...previous, index],
              )
            }
          >
            {rsvps.includes(index) ? (
              <>
                <Icon name="check" size={17} /> You&apos;re going
              </>
            ) : (
              <>
                Count me in <Icon name="arrow" size={17} />
              </>
            )}
          </button>
        </article>
      ))}
    </div>
  )
}
