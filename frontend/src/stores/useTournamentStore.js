// src/stores/useTournamentStore.js

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useTournamentStore = defineStore('tournament', () => {
  const tournaments = ref([])
  const loading = ref(false)
  const error = ref(null)
  const userRegistrations = ref([])

  // Update your getters to use value property
  const upcomingTournaments = computed(() => {
    // Filter by status only, since backend already determines the status 
    // based on the start date and registration status
    return tournaments.value.filter(t => t.status === 'Upcoming');
  });

  const ongoingTournaments = computed(() => 
    tournaments.value.filter(t => t.status === 'Ongoing')
  )

  const pastTournaments = computed(() => 
    tournaments.value.filter(t => 
      t.status === 'Completed' && 
      (t.registeredTeams > 0 && t.isRegistered)  
    )
  )

  const myTournaments = computed(() => 
    tournaments.value.filter(t => t.isRegistered)
  )

  // Actions
  const fetchTournaments = async () => {
    try {
      loading.value = true;
      error.value = null;
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No auth token found');
      }
      
      console.log('Fetching tournaments with token:', token);
      
      const response = await fetch('http://localhost:5000/api/player/tournaments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log('Received tournaments:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch tournaments');
      }

      tournaments.value = data.map(tournament => ({
        ...tournament,
        image: tournament.banner ? `http://localhost:5000${tournament.banner}` : '/placeholder-tournament.jpg'
      }));

      await fetchUserRegistrations();

      console.log('Processed tournaments:', tournaments.value);

    } catch (err) {
      error.value = err.message;
      console.error('Error fetching tournaments:', err);
    } finally {
      loading.value = false;
    }
};

  const fetchUserRegistrations = async () => {
    try {
      // Update this endpoint as well
      const response = await fetch('http://localhost:5000/api/player/tournaments/my-registrations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch registrations')
      }

      const registrations = await response.json()
      userRegistrations.value = registrations

      // Update tournament registration status
      tournaments.value = tournaments.value.map(tournament => ({
        ...tournament,
        // Check if any registration's nested tournament ID matches this tournament ID
        isRegistered: registrations.some(reg => 
          // Handle potential variations in registration data structure
          (reg.tournament?._id?.toString() === tournament._id?.toString()) || 
          (reg.tournamentId?.toString() === tournament._id?.toString())
        )
      }))
    } catch (err) {
      console.error('Error fetching registrations:', err)
    }
  }

  const registerForTournament = async (tournamentId, teamInfo) => {
    try {
      const response = await fetch(`http://localhost:5000/api/tournaments/${tournamentId}/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(teamInfo)
      })

      if (!response.ok) {
        throw new Error('Failed to register for tournament')
      }

      const registration = await response.json()
      
      // Update local state
      const tournamentIndex = tournaments.value.findIndex(t => t._id === tournamentId)
      if (tournamentIndex !== -1) {
        tournaments.value[tournamentIndex].isRegistered = true
        tournaments.value[tournamentIndex].registeredTeams++
      }

      return registration
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  return {
    // State
    tournaments,
    loading,
    error,
    userRegistrations,

    // Getters
    upcomingTournaments,
    ongoingTournaments,
    pastTournaments,
    myTournaments,

    // Actions
    fetchTournaments,
    fetchUserRegistrations,
    registerForTournament
  }
})