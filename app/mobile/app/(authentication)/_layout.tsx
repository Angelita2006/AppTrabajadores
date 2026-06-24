import LoginBG from "@/assets/images/login-bg.png";
import React from "react";
import { Image, View } from "react-native";

const AuthLayout = () => {
  return (
    <View>
      <Image source={LoginBG} />
    </View>
  );
};

export default AuthLayout;
