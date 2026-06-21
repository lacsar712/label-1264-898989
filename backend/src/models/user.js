module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      username: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING(255), allowNull: false },
      role: { type: DataTypes.ENUM('admin', 'student'), allowNull: false, defaultValue: 'student' },
      name: { type: DataTypes.STRING(64), allowNull: false },
      stage: { type: DataTypes.STRING(32), allowNull: false },
      learningStyle: { type: DataTypes.STRING(32), allowNull: false, defaultValue: '视觉型' },
      subjectPreference: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'users',
    }
  );

  return User;
};
