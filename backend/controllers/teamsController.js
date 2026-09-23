const footballApi = require('../services/footballApi');
const User = require('../models/User');

const getTeams = async (req, res) => {
  try {
    const teams = await footballApi.getAvailableTeams();
    res.json({ teams });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar equipos', details: error.message });
  }
};

const setFavoriteTeam = async (req, res) => {
  try {
    const { teamId } = req.body;
    if (!teamId) {
      return res.status(400).json({ error: 'teamId es requerido' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { favoriteTeamId: String(teamId) },
      { returnDocument: 'after' }
    ).select('-passwordHash -totpSecret');

    res.json({
      message: 'Equipo favorito actualizado con éxito',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar equipo favorito', details: error.message });
  }
};

module.exports = {
  getTeams,
  setFavoriteTeam
};
