#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/logs/local"
PID_DIR="$ROOT_DIR/.run"

BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_HOST="${FRONTEND_HOST:-0.0.0.0}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

usage() {
  cat <<'EOF'
Usage: ./run_local.sh <command>

Commands:
  start         Start backend and frontend locally
  stop          Stop local backend and frontend and free their ports
  restart       Stop everything, free ports, and start again
  status        Show process and port status
  logs          Tail both log files
  backend-log   Show recent backend logs
  frontend-log  Show recent frontend logs

Notes:
  - This script does NOT start Postgres/Redis.
  - If ports 8000/3000 are occupied, the script will kill the conflicting process.
  - If startup fails, the script prints recent logs and exits non-zero.
EOF
}

ensure_dirs() {
  mkdir -p "$LOG_DIR" "$PID_DIR"
  touch "$BACKEND_LOG" "$FRONTEND_LOG"
}

load_env() {
  if [[ -f "$ROOT_DIR/.env" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "$ROOT_DIR/.env"
    set +a
  fi

  export POSTGRES_DB="${POSTGRES_DB:-vortex}"
  export POSTGRES_USER="${POSTGRES_USER:-admin}"
  export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-secret}"
  export DB_PORT="${DB_PORT:-5432}"
  export REDIS_PORT="${REDIS_PORT:-6379}"

  if [[ -z "${DATABASE_URL:-}" ]]; then
    export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${DB_PORT}/${POSTGRES_DB}"
  fi
  DATABASE_URL="${DATABASE_URL/@db:/@127.0.0.1:}"
  export DATABASE_URL

  if [[ -z "${REDIS_URL:-}" ]]; then
    export REDIS_URL="redis://127.0.0.1:${REDIS_PORT}/0"
  fi
  if [[ "${REDIS_URL}" == "redis://redis:6379" || "${REDIS_URL}" == "redis://redis:6379/0" ]]; then
    export REDIS_URL="redis://127.0.0.1:${REDIS_PORT}/0"
  fi
}

is_running() {
  local pid="${1:-}"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

read_pid() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    cat "$pid_file"
  fi
}

port_pids() {
  local port="$1"
  lsof -ti tcp:"$port" 2>/dev/null || true
}

kill_port() {
  local port="$1"
  local pids
  pids="$(port_pids "$port")"
  if [[ -z "$pids" ]]; then
    return
  fi

  echo "Freeing port $port"
  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    kill "$pid" 2>/dev/null || true
  done <<< "$pids"

  sleep 1
  pids="$(port_pids "$port")"
  if [[ -n "$pids" ]]; then
    while IFS= read -r pid; do
      [[ -z "$pid" ]] && continue
      kill -9 "$pid" 2>/dev/null || true
    done <<< "$pids"
  fi
}

show_recent_logs() {
  echo
  echo "Recent backend log:"
  tail -n 60 "$BACKEND_LOG" || true
  echo
  echo "Recent frontend log:"
  tail -n 60 "$FRONTEND_LOG" || true
}

wait_for_http() {
  local name="$1"
  local url="$2"
  local timeout="${3:-30}"
  local waited=0

  while (( waited < timeout )); do
    if curl -kfsS "$url" >/dev/null 2>&1; then
      echo "$name is ready at $url"
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done

  echo "$name failed to become ready at $url"
  return 1
}

validate_dependencies() {
  load_env

  if ! timeout 2 bash -c "</dev/tcp/127.0.0.1/${DB_PORT}" 2>/dev/null; then
    echo "Postgres is not reachable on 127.0.0.1:${DB_PORT}"
    return 1
  fi

  if ! timeout 2 bash -c "</dev/tcp/127.0.0.1/${REDIS_PORT}" 2>/dev/null; then
    echo "Redis is not reachable on 127.0.0.1:${REDIS_PORT}"
    return 1
  fi

  if ! PGPASSWORD="${POSTGRES_PASSWORD}" psql -h 127.0.0.1 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "select 1;" >/dev/null 2>&1; then
    echo "Postgres auth failed for ${POSTGRES_USER}@${POSTGRES_DB}. Check DATABASE_URL / POSTGRES_* in .env."
    return 1
  fi
}

start_backend() {
  local pid
  pid="$(read_pid "$BACKEND_PID_FILE")"
  if is_running "$pid"; then
    echo "Backend already running (pid: $pid)"
    return 0
  fi

  echo "Synchronizing database schema..."
  (
    cd "$BACKEND_DIR"
    alembic upgrade head || true
    alembic revision --autogenerate -m "auto_sync_$(date +%s)" || true
    alembic upgrade head
  ) || { echo "Database synchronization failed"; exit 1; }

  kill_port "$BACKEND_PORT"
  : > "$BACKEND_LOG"
  echo "Starting backend on ${BACKEND_HOST}:${BACKEND_PORT}"
  (
    cd "$BACKEND_DIR"
    setsid bash -lc "
      echo \$\$ > '$BACKEND_PID_FILE'
      exec python3 -m uvicorn main:app --host '$BACKEND_HOST' --port '$BACKEND_PORT'
    " </dev/null >>"$BACKEND_LOG" 2>&1 &
  )

  sleep 1
}

start_frontend() {
  local pid
  pid="$(read_pid "$FRONTEND_PID_FILE")"
  if is_running "$pid"; then
    echo "Frontend already running (pid: $pid)"
    return 0
  fi

  kill_port "$FRONTEND_PORT"
  : > "$FRONTEND_LOG"
  echo "Starting frontend on ${FRONTEND_HOST}:${FRONTEND_PORT}"
  (
    cd "$FRONTEND_DIR"
    setsid bash -lc "
      echo \$\$ > '$FRONTEND_PID_FILE'
      export HOST='$FRONTEND_HOST'
      export PORT='$FRONTEND_PORT'
      export HTTPS=false
      export ALLOWED_HOSTS='all'
      export DANGEROUSLY_DISABLE_HOST_CHECK='true'
      exec npm start
    " </dev/null >>"$FRONTEND_LOG" 2>&1 &
  )

  sleep 1
}

stop_service() {
  local name="$1"
  local pid_file="$2"
  local port="$3"
  local pid

  pid="$(read_pid "$pid_file")"
  if is_running "$pid"; then
    echo "Stopping $name (pid: $pid)"
    kill "$pid" 2>/dev/null || true
    sleep 1
    if is_running "$pid"; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  else
    echo "$name not running"
  fi

  rm -f "$pid_file"
  kill_port "$port"
}

get_lan_ip() {
  local ip
  ip=$(hostname -I 2>/dev/null | awk '{print $1}')
  if [[ -z "$ip" ]]; then
    ip=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+')
  fi
  echo "${ip:-127.0.0.1}"
}

status() {
  local bpid fpid
  bpid="$(read_pid "$BACKEND_PID_FILE")"
  fpid="$(read_pid "$FRONTEND_PID_FILE")"
  local backend_listening frontend_listening
  backend_listening="$(port_pids "$BACKEND_PORT" | tr '\n' ' ' | xargs echo -n || true)"
  frontend_listening="$(port_pids "$FRONTEND_PORT" | tr '\n' ' ' | xargs echo -n || true)"

  if is_running "$bpid" && [[ -n "$backend_listening" ]]; then
    echo "Backend: running (pid: $bpid)"
  else
    rm -f "$BACKEND_PID_FILE"
    echo "Backend: stopped"
  fi

  if is_running "$fpid" && [[ -n "$frontend_listening" ]]; then
    echo "Frontend: running (pid: $fpid)"
  else
    rm -f "$FRONTEND_PID_FILE"
    echo "Frontend: stopped"
  fi

  echo "Port ${BACKEND_PORT}: ${backend_listening:-free}"
  echo "Port ${FRONTEND_PORT}: ${frontend_listening:-free}"
  echo "Logs:"
  echo "  $BACKEND_LOG"
  echo "  $FRONTEND_LOG"

  local lan_ip
  lan_ip="$(get_lan_ip)"
  
  echo ""
  echo "--- Network Access ---"
  echo "Local Frontend:   http://127.0.0.1:${FRONTEND_PORT}"
  echo "LAN Frontend:     http://${lan_ip}:${FRONTEND_PORT}  <-- Share this with other users"
  echo "Local Backend:    http://127.0.0.1:${BACKEND_PORT}"
  echo "LAN Backend:      http://${lan_ip}:${BACKEND_PORT}"
  echo "Health Check:     http://${lan_ip}:${BACKEND_PORT}/api/health"
  echo ""
  echo "Troubleshooting:"
  echo " - If remote users cannot connect, ensure port ${FRONTEND_PORT} and ${BACKEND_PORT} are open in your firewall."
  echo " - Example: sudo ufw allow ${FRONTEND_PORT}/tcp && sudo ufw allow ${BACKEND_PORT}/tcp"
  echo "----------------------"
}

tail_logs() {
  ensure_dirs
  echo "Tailing logs (Ctrl+C to exit)"
  tail -f "$BACKEND_LOG" "$FRONTEND_LOG"
}

start_all() {
  ensure_dirs
  if ! validate_dependencies; then
    exit 1
  fi

  start_backend
  if ! wait_for_http "Backend" "http://127.0.0.1:${BACKEND_PORT}/" 30; then
    show_recent_logs
    exit 1
  fi

  start_frontend
  if ! wait_for_http "Frontend" "http://127.0.0.1:${FRONTEND_PORT}/" 45; then
    show_recent_logs
    exit 1
  fi

  status
}

stop_all() {
  stop_service "Frontend" "$FRONTEND_PID_FILE" "$FRONTEND_PORT"
  stop_service "Backend" "$BACKEND_PID_FILE" "$BACKEND_PORT"
}

main() {
  local cmd="${1:-}"
  case "$cmd" in
    start)
      start_all
      ;;
    stop)
      stop_all
      ;;
    restart)
      stop_all
      start_all
      ;;
    status)
      status
      ;;
    logs)
      tail_logs
      ;;
    backend-log)
      tail -n 120 "$BACKEND_LOG"
      ;;
    frontend-log)
      tail -n 120 "$FRONTEND_LOG"
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
