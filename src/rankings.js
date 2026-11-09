export function rankAttendees(attendees, talks, session = 0) {
  const talk = talks[session - 1];
  const people = attendees.map(person => {
    const scores = talks.map(item => person.scores[item.id]?.points ?? null);
    const points = session ? (person.scores[talk?.id]?.points ?? null) : scores.reduce((sum, value) => sum + (value ?? 0), 0);
    return { ...person, scores, points, sessions: session ? Number(points !== null) : scores.filter(value=>value!==null).length,
      initials: person.name.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join('').toUpperCase(), color: 'green' };
  }).filter(person=>person.points!==null).sort((a,b)=>b.points-a.points || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return people.map(person=>({...person, rank:people.findIndex(other=>other.points===person.points)+1}));
}
