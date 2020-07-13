#!/usr/bin/env bash
set -e -x

golang() {
	curl --silent --show-error https://raw.githubusercontent.com/davidkhala/goutils/master/scripts/install.sh | bash -s latest $1
}
install_libtool() {
	if [[ $(uname) == "Darwin" ]]; then
		brew install libtool
	else
		sudo apt-get install -y libtool
	fi
}

java() {
	if [[ $(uname) == "Darwin" ]]; then
		echo "XCode should embed OpenJDK already"
		java --version
	else
		echo "[WARNING] This is to install OpenJDK, Oracle requires fee to use Java in production."
		sudo apt install -y default-jdk
	fi

}
softHSMInstall() {
	if [[ $(uname) == "Darwin" ]]; then
		brew install softhsm
	else
		sudo apt-get install -y softhsm2
	fi
}

fabricInstall() {
	#	If you want the latest production release, omit all version identifiers.
	curl -sSL https://bit.ly/2ysbOFE | bash -s -- -s $1
}
if [[ -n "$1" ]]; then
	"$@"
else
	dockerInstall="curl --silent --show-error https://raw.githubusercontent.com/davidkhala/docker-manager/master/install.sh"
	$dockerInstall | bash -s installDocker
	nodejsInstall="curl --silent --show-error https://raw.githubusercontent.com/davidkhala/node-utils/master/install.sh"
	$nodejsInstall | bash -s nodeGYPDependencies
	$nodejsInstall | bash -s install12
	curl --silent --show-error https://raw.githubusercontent.com/davidkhala/node-utils/master/scripts/npm.sh | bash -s packageLock false
fi
