class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.passwordHash = data.password_hash;
    this.deviceId = data.device_id;           // For device binding
    this.packageName = data.package_name;
    this.createdAt = data.created_at;
  }
}

module.exports = User;