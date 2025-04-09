#!/usr/bin/env node

/**
 * Script to manually generate a bracket for a tournament
 * Usage: node generate-bracket.js <tournamentId>
 * Example: node generate-bracket.js 67f6add2e6fb222696b578b0
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Tournament = require('../models/tournament.model');
const TournamentRegistration = require('../models/tournament.registration.model');
const bracketGenerator = require('../utils/bracketGenerator');

// Handle command line arguments
const tournamentId = process.argv[2];
if (!tournamentId) {
  console.error('Please provide a tournament ID as an argument.');
  console.error('Usage: node generate-bracket.js <tournamentId>');
  process.exit(1);
}

console.log(`[Bracket Generator Script] Starting bracket generation for tournament: ${tournamentId}`);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('[Bracket Generator Script] Connected to MongoDB');
    
    try {
      // Find the tournament
      const tournament = await Tournament.findById(tournamentId);
      
      if (!tournament) {
        console.error(`[Bracket Generator Script] Tournament not found with ID: ${tournamentId}`);
        process.exit(1);
      }
      
      console.log(`[Bracket Generator Script] Found tournament: ${tournament.name}`);
      console.log(`[Bracket Generator Script] Registered teams count: ${tournament.registeredTeams}`);
      
      // Attempt to find registrations using different field patterns
      let registrations = await TournamentRegistration.find({ tournamentId: tournamentId });
      
      if (!registrations || registrations.length === 0) {
        console.log('[Bracket Generator Script] No registrations found with tournamentId field, trying tournament field...');
        registrations = await TournamentRegistration.find({ tournament: tournamentId });
      }
      
      if (!registrations || registrations.length === 0) {
        console.log('[Bracket Generator Script] No registrations found in registration collection. Checking if teams are directly in the tournament document...');
        
        // Check if the tournament has registered teams directly in its document
        if (tournament.bracket && tournament.bracket.rounds && tournament.bracket.rounds.length > 0) {
          // Extract teams from existing bracket if available
          const teamsFromBracket = [];
          const round1 = tournament.bracket.rounds[0];
          
          if (round1) {
            round1.forEach(match => {
              if (match.team1 && match.team1._id !== 'BYE') teamsFromBracket.push(match.team1);
              if (match.team2 && match.team2._id !== 'BYE') teamsFromBracket.push(match.team2);
            });
          }
          
          if (teamsFromBracket.length >= 2) {
            console.log(`[Bracket Generator Script] Found ${teamsFromBracket.length} teams from existing bracket.`);
            registrations = teamsFromBracket;
          }
        }
      }
      
      console.log(`[Bracket Generator Script] Found ${registrations.length} team registrations`);
      
      // Check if we have enough teams
      if (!registrations || registrations.length < 2) {
        console.error(`[Bracket Generator Script] Not enough teams (${registrations?.length || 0}) to generate a bracket. Minimum 2 required.`);
        console.error('[Bracket Generator Script] Please make sure teams are registered for this tournament.');
        
        // Show database sample to help debugging
        console.log('[Bracket Generator Script] Checking for sample registrations in the system:');
        const sampleRegs = await TournamentRegistration.find().limit(2);
        console.log(JSON.stringify(sampleRegs, null, 2));
        
        process.exit(1);
      }
      
      console.log(`[Bracket Generator Script] Generating bracket for ${registrations.length} teams...`);
      console.log('[Bracket Generator Script] Team details:');
      registrations.forEach((team, index) => {
        const teamName = team.teamName || (team.name ? team.name : 'Unknown Team');
        console.log(`- Team ${index + 1}: ${teamName} (ID: ${team._id})`);
      });
      
      // Generate the bracket
      const bracket = bracketGenerator.generateSingleEliminationBracket(
        registrations,
        tournament.maxTeams
      );
      
      if (!bracket) {
        console.error('[Bracket Generator Script] Failed to generate bracket. Check logs for details.');
        process.exit(1);
      }
      
      console.log('[Bracket Generator Script] Bracket generated successfully.');
      console.log(`[Bracket Generator Script] Bracket has ${bracket.rounds.length} rounds with ${bracket.rounds.flat().length} total matches.`);
      
      // Update the tournament with the new bracket
      tournament.bracket = bracket;
      await tournament.save();
      
      console.log('[Bracket Generator Script] Tournament updated with the new bracket.');
      console.log('[Bracket Generator Script] You can now view the bracket in the tournament details.');
      
    } catch (error) {
      console.error('[Bracket Generator Script] Error:', error);
      process.exit(1);
    } finally {
      // Close the database connection
      await mongoose.disconnect();
      console.log('[Bracket Generator Script] Disconnected from MongoDB');
    }
  })
  .catch((err) => {
    console.error('[Bracket Generator Script] MongoDB connection error:', err);
    process.exit(1);
  }); 