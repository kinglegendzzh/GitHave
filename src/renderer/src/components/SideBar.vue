<template>
  <div>
    <div class="logo-container">
      <img src="../assets/banner.svg" alt="Logo" class="logo-img" />
      <span class="logo-text">GitHave</span>
    </div>
    <ul class="nav-list">
      <li>
        <router-link to="/repo" class="nav-item" active-class="active-link">
          代码仓库管理
        </router-link>
      </li>
      <li>
        <router-link to="/config" class="nav-item" active-class="active-link">
          系统配置
        </router-link>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'SideBar'
}
</script>

<style scoped>
.logo-container {
  display: flex;
  align-items: center;
  /* 如果需要可以增加一些间距 */
  margin-bottom: 16px;
}

.logo-img {
  max-width: 40px; /* 根据需求调整大小 */
  height: auto;
  width: auto;
}

.logo-text {
  color: #fff;
  font-size: 1.5em; /* 根据需求调整 */
  margin-left: 8px;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 20px 0;
}

.nav-item {
  display: block;
  padding: 8px 12px;
  color: #fff;
  text-decoration: none;
  border-radius: 4px;
  margin-bottom: 4px;
}

.nav-item:hover {
  background-color: #3e3f43;
}

.active-link {
  background-color: #343541;
}
</style>
